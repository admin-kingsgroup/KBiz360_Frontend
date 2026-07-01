import { apiGet, apiPost, apiPut, apiDelete } from '../../../core/api';

/**
 * Support-ticket accessors — thin wrappers over the shared axios client
 * (Bearer token auto-attached, { success, data } envelope auto-unwrapped).
 * These return plain payloads and never transform — shaping lives in the service.
 *   Backend: /api/support-tickets  (see kbiz360-erp-backend/src/features/support-tickets)
 */

// List tickets. `params` may include: status, type, priority, assignedTo,
// mine (1), open (1), q (search), limit. Omitted/empty params are dropped by apiGet.
export const getTickets = (params = {}) => apiGet('/api/support-tickets', params);

// Board rollup for the header stats.
export const getTicketSummary = () => apiGet('/api/support-tickets/summary');

export const getTicket = (id) => apiGet(`/api/support-tickets/${id}`);

// Raise a new ticket. `body` carries the auto-captured context (pageUrl, module,
// userAgent, branch) alongside the user-entered title/type/priority/description.
export const createTicket = (body) => apiPost('/api/support-tickets', body);

// Triage a ticket (status / priority / type / assignee / title / description).
export const updateTicket = (id, patch) => apiPut(`/api/support-tickets/${id}`, patch);

export const addTicketComment = (id, body) => apiPost(`/api/support-tickets/${id}/comments`, body);

export const deleteTicket = (id) => apiDelete(`/api/support-tickets/${id}`);
