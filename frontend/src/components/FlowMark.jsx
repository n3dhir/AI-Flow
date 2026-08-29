export default function FlowMark({ size = 26, animated = true }) {
  const waveBase = "stroke-[url(#flowgrad)] stroke-[2.5] stroke-linecap-round fill-none"
  const animatedStyle = animated ? "animate-[waveFlow_3s_ease-in-out_infinite]" : ""

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={animated ? "overflow-visible" : ""}
    >
      <path
        className={`${waveBase} ${animatedStyle}`}
        style={animated ? { animationDelay: '0s' } : undefined}
        d="M3 10c4.5-5.5 9 5.5 13 0s8.5 5.5 13 0"
      />
      <path
        className={`${waveBase} ${animatedStyle}`}
        style={animated ? { animationDelay: '0.2s' } : undefined}
        d="M3 17c4.5-5.5 9 5.5 13 0s8.5 5.5 13 0"
      />
      <path
        className={`${waveBase} ${animatedStyle}`}
        style={animated ? { animationDelay: '0.4s' } : undefined}
        d="M3 24c4.5-5.5 9 5.5 13 0s8.5 5.5 13 0"
      />
    </svg>
  )
}
