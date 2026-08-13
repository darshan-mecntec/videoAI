'use client';

import { useState } from 'react';

const PRICING_TIERS = [
  {
    name: 'Basic',
    price: '$9',
    period: '/month',
    credits: '1,000 Credits',
    desc: 'For hobbyists creating basic AI images and video clips',
    features: ['Access to Kling 3.0 & Soul 2.0', 'Standard generation queue', '1080p video exports', 'Personal usage license'],
    isPopular: false,
    cta: 'Choose Basic',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    credits: '4,000 Credits',
    desc: 'For professional creators & visual storytellers',
    features: ['All Basic features', 'Google Veo 3.1 & Sora 2 models', 'Veo Flow Video Extension', 'Shots 3.0 & Angles 2.0 apps', 'Fast priority queue'],
    isPopular: true,
    cta: 'Choose Pro',
  },
  {
    name: 'Ultimate',
    price: '$69',
    period: '/month',
    credits: '12,000 Credits',
    desc: 'For indie filmmakers, studios & heavy power users',
    features: ['All Pro features', 'Cinema Studio 3.5 AI Director', 'Soul Cast custom character locking', 'Unlimited Canvas multi-model graphs', 'Highest priority turbo queue'],
    isPopular: false,
    cta: 'Choose Ultimate',
  },
  {
    name: 'Creator / Team',
    price: '$149',
    period: '/month',
    credits: '30,000 Credits',
    desc: 'For creative agencies and production teams',
    features: ['All Ultimate features', 'Live team canvas collaboration', 'MCP & CLI Agent access', 'Commercial license & API key', 'Dedicated account manager'],
    isPopular: false,
    cta: 'Contact Sales',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <div className="flex-1 bg-[#0f1113] p-4 sm:p-8 text-zinc-100 font-sans max-w-7xl mx-auto w-full space-y-8">
      
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold uppercase">
          <span>🔥</span> Limited Time Offer — 30% OFF Annual Billing
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-grotesk tracking-tight uppercase">
          Pricing Plans & Credits
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Choose a plan that fits your creative goals. Access 30+ AI models including Sora 2, Kling 3.0, and Veo 3.1.
        </p>

        {/* Toggle */}
        <div className="pt-2 flex justify-center">
          <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex gap-1 text-xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg font-bold transition ${
                billingCycle === 'monthly' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-lg font-bold transition ${
                billingCycle === 'annual' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Annual Billing (30% OFF)
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-2xl bg-[#16181c] border p-6 space-y-6 flex flex-col justify-between shadow-xl transition ${
              tier.isPopular ? 'border-purple-500 shadow-purple-500/20' : 'border-white/10 hover:border-white/20'
            }`}
          >
            {tier.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow">
                Most Popular
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white font-grotesk">{tier.name}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-tight">{tier.desc}</p>
              </div>

              <div className="border-t border-white/5 pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white font-grotesk">{tier.price}</span>
                  <span className="text-xs text-zinc-400">{tier.period}</span>
                </div>
                <div className="text-xs font-mono text-purple-400 font-bold mt-1">
                  ⚡ {tier.credits}
                </div>
              </div>

              <ul className="space-y-2 text-xs text-zinc-300 pt-2 border-t border-white/5">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <span className="text-purple-400 font-bold">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition shadow-md ${
                tier.isPopular
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
