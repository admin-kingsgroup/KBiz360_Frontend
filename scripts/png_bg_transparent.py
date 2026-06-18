#!/usr/bin/env python3
"""Make the light/near-white background of a PNG transparent (pure stdlib).
Reads a non-interlaced 8-bit PNG (as produced by `sips -s format png`), keeps
coloured/dark ink, and turns light low-saturation pixels transparent with a soft
edge ramp so logos sit cleanly on a white page. Usage: in.png out.png"""
import sys, zlib, struct

def read_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    pos = 8
    width = height = bitdepth = colortype = None
    idat = bytearray()
    while pos < len(data):
        (length,) = struct.unpack('>I', data[pos:pos+4]); pos += 4
        ctype = data[pos:pos+4]; pos += 4
        chunk = data[pos:pos+length]; pos += length
        pos += 4  # crc
        if ctype == b'IHDR':
            width, height, bitdepth, colortype, comp, filt, interlace = struct.unpack('>IIBBBBB', chunk)
            assert bitdepth == 8 and interlace == 0, 'need 8-bit non-interlaced PNG (got bd=%s il=%s)' % (bitdepth, interlace)
        elif ctype == b'IDAT':
            idat += chunk
        elif ctype == b'IEND':
            break
    raw = zlib.decompress(bytes(idat))
    channels = {0: 1, 2: 3, 4: 2, 6: 4}[colortype]
    return width, height, channels, raw

def unfilter(raw, width, height, ch):
    stride = width * ch
    out = bytearray(stride * height)
    prev = bytearray(stride)
    pos = 0
    for y in range(height):
        ft = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos+stride]); pos += stride
        if ft == 1:      # Sub
            for i in range(ch, stride):
                line[i] = (line[i] + line[i-ch]) & 255
        elif ft == 2:    # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif ft == 3:    # Average
            for i in range(stride):
                a = line[i-ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif ft == 4:    # Paeth
            for i in range(stride):
                a = line[i-ch] if i >= ch else 0
                b = prev[i]
                c = prev[i-ch] if i >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return out

def to_rgba(samples, width, height, ch):
    rgba = bytearray(width * height * 4)
    for p in range(width * height):
        s = p * ch
        if ch >= 3:
            r, g, b = samples[s], samples[s+1], samples[s+2]
        else:  # grayscale
            r = g = b = samples[s]
        mn, mx = min(r, g, b), max(r, g, b)
        sat = mx - mn
        # Light & low-saturation -> background. Soft ramp on the edge band.
        if sat <= 24:
            if mn >= 236:
                a = 0
            elif mn >= 205:
                a = int(255 * (236 - mn) / 31)
            else:
                a = 255
        else:
            a = 255
        o = p * 4
        rgba[o], rgba[o+1], rgba[o+2], rgba[o+3] = r, g, b, a
    return rgba

def write_png(path, rgba, width, height):
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter None
        raw += rgba[y*stride:(y+1)*stride]
    comp = zlib.compress(bytes(raw), 9)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', comp))
        f.write(chunk(b'IEND', b''))

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    w, h, ch, raw = read_png(src)
    samples = unfilter(raw, w, h, ch)
    rgba = to_rgba(samples, w, h, ch)
    write_png(dst, rgba, w, h)
    print('wrote %s  (%dx%d, ch=%d -> RGBA)' % (dst, w, h, ch))
