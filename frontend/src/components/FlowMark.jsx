export default function FlowMark({ size = 26, animated = true }) {
  return (
    <svg
      className={`flowmark${animated ? ' flowmark--animated' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="flowgrad" x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5ce8c5" />
          <stop offset="1" stopColor="#9db8ff" />
        </linearGradient>
      </defs>
      <path className="flowmark__wave flowmark__wave--1" d="M3 10c4.5-5.5 9 5.5 13 0s8.5 5.5 13 0" />
      <path className="flowmark__wave flowmark__wave--2" d="M3 17c4.5-5.5 9 5.5 13 0s8.5 5.5 13 0" />
      <path className="flowmark__wave flowmark__wave--3" d="M3 24c4.5-5.5 9 5.5 13 0s8.5 5.5 13 0" />
    </svg>
  )
}
