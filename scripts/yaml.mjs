/**
 * yaml.mjs, Gemeinsamer YAML-Parser (block + flow maps/lists).
 * Ausreichend für sources.yml, data/overrides.yml.
 * Keine Runtime-Deps.
 */

export function parseFlow(s) {
  s = s.trim();
  if (s.startsWith("{") && s.endsWith("}")) {
    const inner = s.slice(1, -1).trim();
    const obj = {};
    if (!inner) return obj;
    for (const part of splitFlow(inner)) {
      const idx = part.indexOf(":");
      if (idx < 0) continue;
      const k = part.slice(0, idx).trim();
      const v = parseFlow(part.slice(idx + 1).trim());
      obj[k] = v;
    }
    return obj;
  }
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitFlow(inner).map((p) => parseFlow(p.trim()));
  }
  return parseScalar(s);
}

function splitFlow(s) {
  const parts = [];
  let depth = 0, cur = "", inStr = null;
  for (const ch of s) {
    if (inStr) {
      cur += ch;
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = ch; cur += ch; continue; }
    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseScalar(s) {
  s = s.trim();
  if (s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  const n = Number(s);
  if (s !== "" && !isNaN(n)) return n;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

// Rekursiver Parser: verarbeitet eine Liste von {indent, text}-Zeilen.
function parseBlock(lines, startIdx) {
  const root = {};
  let i = startIdx;
  let lastKey = null;
  const baseIndent = lines[startIdx].indent;
  while (i < lines.length) {
    const { indent, text } = lines[i];
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }
    if (text.startsWith("- ")) {
      const arr = [];
      while (i < lines.length && lines[i].indent === baseIndent && lines[i].text.startsWith("- ")) {
        const itemText = lines[i].text.slice(2).trim();
        const itemMatch = itemText.match(/^([^:]+):\s*(.*)$/);
        if (itemMatch && !itemText.startsWith("{") && !itemText.startsWith("[")) {
          const item = {};
          const k = itemMatch[1].trim();
          const v = itemMatch[2].trim();
          if (v === "") {
            const childLines = [];
            let j = i + 1;
            while (j < lines.length && lines[j].indent > baseIndent) { childLines.push(lines[j]); j++; }
            item[k] = childLines.length ? parseBlock(childLines, 0) : {};
            i = j;
          } else {
            item[k] = parseFlow(v);
            i++;
          }
          while (i < lines.length && lines[i].indent > baseIndent) {
            const sub = lines[i];
            const sm = sub.text.match(/^([^:]+):\s*(.*)$/);
            if (!sm) { i++; continue; }
            const sk = sm[1].trim();
            const sv = sm[2].trim();
            if (sv === "") {
              const childLines = [];
              let j = i + 1;
              while (j < lines.length && lines[j].indent > sub.indent) { childLines.push(lines[j]); j++; }
              item[sk] = childLines.length ? parseBlock(childLines, 0) : {};
              i = j;
            } else {
              item[sk] = parseFlow(sv);
              i++;
            }
          }
          arr.push(item);
        } else {
          arr.push(parseFlow(itemText));
          i++;
        }
      }
      if (lastKey) root[lastKey] = arr;
      else if (Array.isArray(root)) root.push(...arr);
      else return arr; // top-level list block → array
      lastKey = null;
    } else {
      const m = text.match(/^([^:]+):\s*(.*)$/);
      if (!m) { i++; continue; }
      const key = m[1].trim();
      const rest = m[2].trim();
      if (rest === "") {
        const childLines = [];
        let j = i + 1;
        while (j < lines.length && lines[j].indent > indent) { childLines.push(lines[j]); j++; }
        root[key] = childLines.length ? parseBlock(childLines, 0) : {};
        i = j;
      } else {
        root[key] = parseFlow(rest);
        i++;
      }
      lastKey = key;
    }
  }
  return root;
}

export function parseYaml(text) {
  const lines = text.split("\n")
    .map((raw, idx) => ({ indent: raw.match(/^\s*/)[0].length, text: raw.trim(), idx }))
    .filter((l) => l.text && !l.text.startsWith("#"));
  if (!lines.length) return {};
  return parseBlock(lines, 0);
}
