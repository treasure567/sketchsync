const ink = '#12122a'
const brand = '#5b4cf5'
const teal = '#1f6f5a'

const gridDots = Array.from({ length: 4 }, (_, row) => Array.from({ length: 6 }, (_, col) => ({ cx: 172 + col * 21, cy: 80 + row * 20 }))).flat()

/** An easel whiteboard with a sticky note, pencil and doodles around it. */
export function EmptyBoardsIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[440px]" aria-hidden="true">
      <span className="absolute top-[8%] left-[2%] -rotate-6 font-hand text-xl font-semibold text-brand-600">blank canvas ✨</span>
      <span className="absolute top-[13%] right-[1%] rotate-6 font-hand text-xl font-semibold text-[#b4610e]">anything is possible!</span>

      <svg viewBox="0 0 440 260" fill="none" className="w-full">
        {/* Floor shadow */}
        <ellipse cx="226" cy="236" rx="128" ry="11" fill="#ece9fe" />

        {/* Easel legs and board */}
        <path d="M188 178 L170 232 M262 178 L280 232 M225 178 V224" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />
        <rect x="156" y="62" width="140" height="116" rx="7" fill="white" stroke={ink} strokeWidth={3.5} />
        {gridDots.map(({ cx, cy }) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="#c9c4f5" />
        ))}
        <path d="M172 158 C 196 150, 206 132, 226 134 S 258 118, 282 100" stroke={brand} strokeWidth={3} strokeLinecap="round" />

        {/* Light bulb */}
        <circle cx="226" cy="30" r="9" fill="#fcd34d" />
        <rect x="222" y="38" width="8" height="5" rx="1" fill={ink} />
        <path d="M226 10 v-5 M210 18 l-4-3 M242 18 l4-3" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />

        {/* Sticky note */}
        <g transform="rotate(-8 136 196)">
          <rect x="98" y="170" width="78" height="52" rx="3" fill="#fdf1c4" stroke="#f0d27a" strokeWidth={1.5} />
          <text x="110" y="200" className="font-hand" fontSize="15" fontWeight={600} fill="#3f3416">
            idea #1?
          </text>
        </g>

        {/* Pencil */}
        <g transform="rotate(36 300 196)">
          <rect x="274" y="191" width="46" height="9" rx="2" fill="#f59e0b" />
          <rect x="314" y="191" width="8" height="9" fill="#fbcfe8" />
          <path d="M274 191 l-10 4.5 10 4.5z" fill="#fde68a" stroke={ink} strokeWidth={1} strokeLinejoin="round" />
        </g>

        {/* Doodles */}
        <path d="M78 128 c-8-10 6-22 16-12 s-2 22-14 16" stroke={teal} strokeWidth={2.2} strokeLinecap="round" />
        <path d="M336 104 v12 M330 110 h12" stroke={teal} strokeWidth={2.2} strokeLinecap="round" />
        <circle cx="364" cy="158" r="11" stroke="#c9c4f5" strokeWidth={2.2} />
        <path d="M352 206 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#f59e0b" />
      </svg>
    </div>
  )
}
