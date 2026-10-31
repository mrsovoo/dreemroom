import React from "react";
import Sheet from "../Sheet";
import { getBrandConfig } from "../../config/brandConfig";

type SizeGuideModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const defaultSizeGuideData: Record<string, { height: string; weight: string }> = {
  XS: { height: "150–158 sm", weight: "40–48 kg" },
  S: { height: "158–165 sm", weight: "48–55 kg" },
  M: { height: "165–172 sm", weight: "55–62 kg" },
  L: { height: "170–178 sm", weight: "62–70 kg" },
  XL: { height: "175–182 sm", weight: "70–78 kg" },
  XXL: { height: "180–190 sm", weight: "78–88 kg" },
  "3XL": { height: "185–195 sm", weight: "88–98 kg" },
  Standart: { height: "158–180 sm", weight: "48–78 kg (Universal)" },
};

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  if (!isOpen) return null;
  const config = getBrandConfig();

  return (
    <Sheet key="size-guide" title="O'lchamlar jadvali" onClose={onClose}>
      <div className="size-guide-modal-content">
        <div className="size-guide-modal-header">
          <span className="size-guide-modal-badge">STANDART PARAMETRLAR</span>
          <p className="size-guide-modal-desc">
            O'zingizga eng mos keluvchi o'lchamni aniqlash uchun quyidagi tavsiyalardan foydalaning:
          </p>
        </div>

        <div className="size-guide-table-wrap">
          <table className="size-guide-table">
            <thead>
              <tr>
                <th>O'lcham</th>
                <th>Tavsiya bo'y</th>
                <th>Tavsiya vazn</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(defaultSizeGuideData).map(([sz, val]) => (
                <tr key={sz}>
                  <td>
                    <span className="size-name-badge">{sz}</span>
                  </td>
                  <td>{val.height}</td>
                  <td>{val.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="size-guide-tip-box">
          <div className="size-guide-tip-icon">💡</div>
          <div className="size-guide-tip-text">
            <strong>Foydali maslahat:</strong>
            <p>
              Agar siz ikkita o'lcham oralig'ida bo'lsangiz yoki erkinroq (oversize) uslubni ma'qul ko'rsangiz, bir o'lcham kattaroq tanlashni tavsiya qilamiz.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-full size-guide-close-btn"
          onClick={onClose}
        >
          Tushunarli
        </button>
      </div>
    </Sheet>
  );
}

