"use client";

import Link from "next/link";
import { useState } from "react";
import { FL_SOCIALS } from "@/lib/florencess-data";

const BG = "/florencess/img/wide-1.webp";

/**
 * The reference closes the homepage with one row split into two halves
 * (713x337 each) that share the same photograph behind centred white copy:
 * the social invite on the left, the newsletter sign-up on the right.
 */
export default function SocialNewsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="fl-sn" aria-label="Social and newsletter">
      <div className="fl-sn__half">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fl-sn__bg" src={BG} alt="" aria-hidden="true" loading="lazy" />
        <div className="fl-sn__copy">
          <p className="fl-sn__script">over 1 million fans on instagram</p>
          <h2 className="fl-sn__title">JOIN THE SOCIAL CIRCLE</h2>
          <p className="fl-sn__line">
            <span>FOLLOW US ON</span>
            {FL_SOCIALS.map((s) => (
              <Link key={s.label} href={s.href}>
                {s.label.toUpperCase()}
              </Link>
            ))}
          </p>
        </div>
      </div>

      <div className="fl-sn__half">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fl-sn__bg" src={BG} alt="" aria-hidden="true" loading="lazy" />
        <div className="fl-sn__copy">
          <p className="fl-sn__script">inside news &amp; instant privileges</p>
          <h2 className="fl-sn__title">THE FLORENCESS NEWSLETTER</h2>
          <p className="fl-sn__line">
            {done
              ? "THANK YOU — YOUR 10% WELCOME CODE IS ON ITS WAY"
              : "SIGN UP NOW & GET A 10% OFF WELCOME BONUS FOR YOUR FIRST ORDER"}
          </p>
          <form
            className="fl-sn__form"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) {
                setDone(true);
                setEmail("");
              }
            }}
          >
            <input
              className="fl-sn__input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              aria-label="Email address"
            />
            <button className="fl-sn__submit" type="submit">
              SIGN UP
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
