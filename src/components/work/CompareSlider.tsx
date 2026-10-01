"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { ProjectShowcase } from "@/content/projects";

/** Before/after wipe; a native range input makes it keyboard- and screen-reader-friendly. */
export default function CompareSlider({ compare }: { compare: NonNullable<ProjectShowcase["compare"]> }) {
  const [position, setPosition] = useState(50);
  return (
    <figure className="compare-figure">
      <div className="compare" style={{ "--split": `${position}%`, aspectRatio: `${compare.width} / ${compare.height}` } as CSSProperties}>
        <Image src={compare.before} alt={`${compare.alt}, original photo`} fill sizes="(max-width: 900px) 100vw, 1000px" unoptimized />
        <div className="compare-after">
          <Image src={compare.after} alt={`${compare.alt}, after the pipeline`} fill sizes="(max-width: 900px) 100vw, 1000px" unoptimized />
        </div>
        <span className="compare-tag compare-tag-before" aria-hidden="true">Original</span>
        <span className="compare-tag compare-tag-after" aria-hidden="true">After</span>
        <span className="compare-handle" aria-hidden="true" />
        <input type="range" min={0} max={100} value={position} onChange={event => setPosition(Number(event.target.value))}
          aria-label="Compare the original photo with the result" aria-valuetext={`${position}% original`} />
      </div>
      <figcaption>{compare.caption}</figcaption>
    </figure>
  );
}
