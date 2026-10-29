"use client";

import type { PartInfo } from "@/score/types";

export const ROLE_OPTIONS = ["S", "S1", "S2", "A", "A1", "A2", "T", "T1", "T2", "B", "B1", "B2", "?"];

const ROLE_FAMILY: Record<string, string> = { S: "soprano", A: "alto", T: "tenor", B: "bass" };
const familyOf = (role: string) => ROLE_FAMILY[role[0]] ?? "unknown";

interface Props {
  parts: PartInfo[];
  roles: Record<string, string>;
  volumes: Record<string, number>;
  onRoleChange(partId: string, role: string): void;
  onVolumeChange(partId: string, volume: number): void;
  onSolo(partId: string): void;
}

/** One row per singable line: its colour by voice family, role picker, solo button and volume. */
export function PartList({ parts, roles, volumes, onRoleChange, onVolumeChange, onSolo }: Props) {
  return (
    <ol className="parts" aria-label="파트 목록">
      {parts.map((part) => {
        const role = roles[part.id] ?? "?";
        const label = part.name || `${part.staff}단`;
        return (
          <li key={part.id} className={`part part-${familyOf(role)}`} data-testid="part-row">
            <span className="part-swatch" aria-hidden />
            <span className="part-name">{label}</span>
            <label className="part-role">
              <span className="visually-hidden">{label} 역할</span>
              <select value={role} onChange={(e) => onRoleChange(part.id, e.target.value)} aria-label={`${label} 역할`}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === "?" ? "모름" : r}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => onSolo(part.id)}>
              이 파트만 듣기
            </button>
            <label className="part-volume">
              <span className="visually-hidden">{label} 음량</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volumes[part.id] ?? 1}
                onChange={(e) => onVolumeChange(part.id, Number(e.target.value))}
                aria-label={`${label} 음량`}
              />
            </label>
          </li>
        );
      })}
    </ol>
  );
}
