import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Upload } from 'lucide-react';
import { Modal } from '../../../core/ux/Modal';
import { Button, FormField, Input, Select, Textarea } from '../../../shell/primitives';
import { toastSuccess, toastError } from '../../../core/ux/toast';
import { useCreateTicket, useUploadTicketAttachment } from '../hooks/use-tickets';
import { TICKET_TYPES, TICKET_PRIORITIES, currentUser, moduleForRoute } from '../services/support.service';

const MAX_RECORD_SECONDS = 120;
const MAX_SCREENSHOT_BYTES = 15 * 1024 * 1024; // matches the backend's multer limit
const formatElapsed = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Raise-a-ticket dialog — shared by the Support page's "Raise Ticket" button and
 * the app-wide floating "Report an issue" button, so the capture form is identical
 * everywhere. It auto-attaches the page/module/browser context (this app stores
 * link metadata, never binary uploads), so a one-line report is still actionable.
 *
 * Props:
 *   route       — the current route (auto-captured as pageUrl + module)
 *   initial     — optional {title, description} to pre-fill (e.g. from the screen-
 *                 number badge's "Report" action, which seeds the screen context)
 *   onClose()   — dismiss the dialog
 *   onCreated(ticket) — optional; fired after a successful create
 */
export function CreateTicketModal({ route, initial, onClose, onCreated }) {
  const captureRoute = route || (typeof window !== 'undefined' ? window.location.pathname : '');
  const user = currentUser();
  const [form, setForm] = useState({
    title: initial?.title || '', type: 'bug', priority: 'medium',
    description: initial?.description || '', linkUrl: '',
  });
  const [touched, setTouched] = useState(false);
  const create = useCreateTicket();
  const uploadVoiceNote = useUploadTicketAttachment();
  const uploadScreenshot = useUploadTicketAttachment();

  // Voice note recording — kept local to this modal; nothing is uploaded until submit.
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | recorded
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioUrlRef = useRef('');

  // Screenshot picked from device — also local until submit.
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const screenshotInputRef = useRef(null);
  const screenshotPreviewRef = useRef('');

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    if (screenshotPreviewRef.current) URL.revokeObjectURL(screenshotPreviewRef.current);
  }, []);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const titleError = touched && !form.title.trim() ? 'A short title is required.' : '';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordingState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) { stopRecording(); return MAX_RECORD_SECONDS; }
          return s + 1;
        });
      }, 1000);
    } catch {
      toastError('Microphone access was denied or is unavailable.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecordingState('recorded');
  };

  const discardRecording = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = '';
    setAudioBlob(null);
    setAudioUrl('');
    setElapsed(0);
    setRecordingState('idle');
  };

  const pickScreenshot = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) return toastError('Please choose an image file.');
    if (file.size > MAX_SCREENSHOT_BYTES) return toastError('Screenshot is too large (max 15MB).');
    if (screenshotPreviewRef.current) URL.revokeObjectURL(screenshotPreviewRef.current);
    const url = URL.createObjectURL(file);
    screenshotPreviewRef.current = url;
    setScreenshotFile(file);
    setScreenshotPreview(url);
  };

  const discardScreenshot = () => {
    if (screenshotPreviewRef.current) URL.revokeObjectURL(screenshotPreviewRef.current);
    screenshotPreviewRef.current = '';
    setScreenshotFile(null);
    setScreenshotPreview('');
  };

  const submit = async () => {
    setTouched(true);
    if (!form.title.trim()) return;
    const attachments = form.linkUrl.trim() ? [{ name: 'Reference link', url: form.linkUrl.trim() }] : [];
    if (audioBlob) {
      try {
        const res = await uploadVoiceNote.mutateAsync(audioBlob);
        attachments.push({ name: 'Voice note', key: res?.key });
      } catch (err) {
        toastError(err?.message || 'Could not upload the voice note. Please try again.');
        return;
      }
    }
    if (screenshotFile) {
      try {
        const res = await uploadScreenshot.mutateAsync(screenshotFile);
        attachments.push({ name: screenshotFile.name || 'Screenshot', key: res?.key });
      } catch (err) {
        toastError(err?.message || 'Could not upload the screenshot. Please try again.');
        return;
      }
    }
    const body = {
      title: form.title.trim(),
      type: form.type,
      priority: form.priority,
      description: form.description.trim(),
      module: moduleForRoute(captureRoute),
      pageUrl: captureRoute,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      branch: user.branch || '',
      attachments,
    };
    create.mutate(body, {
      onSuccess: (ticket) => {
        toastSuccess(`Ticket ${ticket?.ref || ''} raised — thank you!`);
        onCreated?.(ticket);
        onClose?.();
      },
      onError: (err) => toastError(err?.message || 'Could not raise the ticket. Please try again.'),
    });
  };

  return (
    <Modal
      title="Raise a support ticket"
      sub="Report a bug, error, or request a change / improvement — this reaches the whole team."
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={create.isPending || uploadVoiceNote.isPending || uploadScreenshot.isPending}
            disabled={recordingState === 'recording'}
            onClick={submit}
          >
            {uploadVoiceNote.isPending
              ? 'Uploading voice note…'
              : uploadScreenshot.isPending
              ? 'Uploading screenshot…'
              : create.isPending
              ? 'Sending…'
              : 'Raise ticket'}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        <FormField label="Title" required error={titleError}>
          <Input
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Trial Balance export crashes on large date range"
            maxLength={200}
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
          <FormField label="Type" required>
            <Select value={form.type} onChange={set('type')}>
              {TICKET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority" required>
            <Select value={form.priority} onChange={set('priority')}>
              {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </FormField>
        </div>

        <FormField label="Description" hint="Steps to reproduce, what you expected, and what actually happened.">
          <Textarea
            value={form.description}
            onChange={set('description')}
            rows={5}
            placeholder="Describe the issue or the change you'd like…"
            maxLength={8000}
          />
        </FormField>

        <FormField label="Screenshot / reference link (optional)" hint="Paste a link, or upload an image from your device.">
          <div className="flex flex-col gap-2">
            <Input value={form.linkUrl} onChange={set('linkUrl')} placeholder="https://…" type="url" />
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={pickScreenshot}
            />
            {!screenshotFile ? (
              <Button type="button" variant="secondary" size="sm" icon={Upload} onClick={() => screenshotInputRef.current?.click()}>
                Upload screenshot
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <img src={screenshotPreview} alt="Screenshot preview" className="h-10 w-10 rounded-md border border-surface-border object-cover" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">{screenshotFile.name}</span>
                <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={discardScreenshot}>
                  Remove
                </Button>
              </div>
            )}
          </div>
        </FormField>

        <FormField label="Voice note (optional)" hint={recordingState === 'idle' ? `Record up to ${MAX_RECORD_SECONDS / 60} minutes — useful for describing what went wrong.` : undefined}>
          {recordingState === 'idle' && (
            <Button type="button" variant="secondary" icon={Mic} onClick={startRecording}>
              Record voice note
            </Button>
          )}
          {recordingState === 'recording' && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
                <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
                {formatElapsed(elapsed)}
              </span>
              <Button type="button" variant="danger" size="sm" icon={Square} onClick={stopRecording}>
                Stop
              </Button>
            </div>
          )}
          {recordingState === 'recorded' && (
            <div className="flex items-center gap-2">
              <audio controls src={audioUrl} className="h-9 max-w-[240px] flex-1" />
              <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={discardRecording}>
                Remove
              </Button>
            </div>
          )}
        </FormField>

        {/* Auto-captured context — reassure the user we already know the where/what. */}
        <div className="rounded-md border border-surface-border bg-surface-alt px-3 py-2 text-[11px] text-ink-muted">
          Auto-attached: page <span className="font-semibold text-ink">{captureRoute || '—'}</span>
          {moduleForRoute(captureRoute) && <> · module <span className="font-semibold text-ink">{moduleForRoute(captureRoute)}</span></>}
          {user.branch && <> · branch <span className="font-semibold text-ink">{user.branch}</span></>}
          · your name & browser info
        </div>
      </div>
    </Modal>
  );
}

export default CreateTicketModal;
