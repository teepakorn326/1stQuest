import { CategoryIcon, HeartIcon, MessageIcon } from "@/components/icons";
import { CATEGORY_LABEL } from "@/lib/activityText";
import type { Category } from "@/lib/db/types";

export function CardFace({
  title,
  body,
  category,
  coverId,
  dateLabel,
  likes = 0,
  messages = 0,
}: {
  title: string;
  body: string;
  category: Category;
  coverId: string | null;
  dateLabel: string;
  likes?: number;
  messages?: number;
}) {
  return (
    <article className="reveal-face relative flex flex-col overflow-hidden rounded-[20px] border-[3px] border-[#BFD8EE] bg-surface text-ink shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <div className="relative flex h-[190px] items-end bg-[#A4C4DF] p-3">
        {coverId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/v1/media/${coverId}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className="relative flex items-center gap-1.5 rounded-[14px] bg-surface px-2.5 py-1 text-[13px] font-bold text-primary-hover">
          <CategoryIcon category={category} size={16} />
          {CATEGORY_LABEL[category]}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 px-[18px] pt-4 pb-[18px]">
        <h2 className="m-0 text-[21px] leading-tight font-bold">{title}</h2>
        <p className="m-0 text-[15px] leading-relaxed text-[#33475A]">{body}</p>
        <div className="flex items-center justify-between border-t border-[#E6EEF4] pt-2">
          <span className="text-sm text-ink-3">{dateLabel}</span>
          <span className="flex items-center gap-3 text-sm text-ink-2">
            <span className="flex items-center gap-1">
              <HeartIcon size={16} />
              {likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageIcon size={16} />
              {messages}
            </span>
          </span>
        </div>
      </div>
      <div className="reveal-shine" aria-hidden />
    </article>
  );
}
