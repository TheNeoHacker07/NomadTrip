import Image from "next/image";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { images, type ImageKey } from "@/lib/images";

type PhotoProps = {
  name: ImageKey;
  /** Tailwind `sizes` hint for the responsive srcset. */
  sizes: string;
  /** Tailwind aspect-ratio class for the visible frame; the photo is cropped to fill it. */
  frame?: string;
  /** Only the first hero image on a page; everything else lazy-loads. */
  priority?: boolean;
  /** Make the credit a link to the Commons page. Turn off inside another link (nested anchors are invalid). */
  linkCredit?: boolean;
  className?: string;
};

/** A manifest photo with its required attribution caption ("Photo: author, license"). */
export async function Photo({ name, sizes, frame = "aspect-[3/2]", priority = false, linkCredit = true, className = "" }: PhotoProps) {
  const [lang, t] = await Promise.all([getLang(), getDictionary("included")]);
  const img = images[name];
  const credit = interpolate(t.photo.credit, { author: img.author, license: img.license });
  return (
    <figure className={className}>
      <div className={`${frame} relative overflow-hidden rounded-2xl bg-border/60`}>
        <Image
          src={img.src}
          width={img.width}
          height={img.height}
          alt={localize(img.alt, lang)}
          sizes={sizes}
          priority={priority}
          className="size-full object-cover"
        />
      </div>
      <figcaption className="mt-1.5 text-xs text-muted">
        {linkCredit ? (
          <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">
            {credit}
          </a>
        ) : (
          credit
        )}
      </figcaption>
    </figure>
  );
}
