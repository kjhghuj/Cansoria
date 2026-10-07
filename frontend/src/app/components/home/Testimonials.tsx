"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowRightIcon, StarIcon, XIcon } from "@phosphor-icons/react";

const reviews = [
  { name: "Emily R.", image: "review-emily", quote: "Absolutely stunning! The painting looks exactly like my dog. It brings so much warmth to our home." },
  { name: "Michael T.", image: "review-michael", quote: "The details are incredible. You can feel the love and talent in every brushstroke." },
  { name: "Sophia L.", image: "review-sophia", quote: "The best gift I’ve ever given myself. It made me cry when I saw it." },
];

function ReviewCards() {
  return reviews.map(review => (
    <figure key={review.name} className="portrait-review-card">
      <div className="review-photo"><Image src={`/images/home/${review.image}.webp`} alt={`${review.name}'s pet portrait story`} fill sizes="(max-width: 640px) 100px, 12vw" /></div>
      <figcaption>
        <blockquote>“{review.quote}”</blockquote>
        <span className="portrait-stars" role="img" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <StarIcon key={index} weight="fill" aria-hidden="true" />)}</span>
        <p>{review.name}</p>
      </figcaption>
    </figure>
  ));
}

export function Testimonials() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <section className="portrait-reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="portrait-container">
        <div className="portrait-section-heading">
          <div><h2 id="reviews-title">Loved by Pet Parents</h2><p>Join thousands of happy customers around the world.</p></div>
          <button type="button" className="portrait-text-link" onClick={() => dialogRef.current?.showModal()}>See All Reviews <ArrowRightIcon weight="light" /></button>
        </div>
        <div className="portrait-review-grid"><ReviewCards /></div>
      </div>
      <dialog ref={dialogRef} className="portrait-reviews-dialog" aria-labelledby="all-reviews-title" onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <div className="reviews-dialog-heading"><h2 id="all-reviews-title">Stories from Pet Parents</h2><button type="button" aria-label="Close reviews" onClick={() => dialogRef.current?.close()}><XIcon size={24} weight="light" /></button></div>
        <p className="reviews-dialog-intro">A little love, captured in every brushstroke.</p>
        <div className="reviews-dialog-list"><ReviewCards /></div>
      </dialog>
    </section>
  );
}
