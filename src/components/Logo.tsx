/** Beeldmerk: de boog en de ronding uit de "d" van Driessen. */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 40 40" role="img" aria-label="Driessen Groep">
      <circle cx="17" cy="24.5" r="10.5" fill="none" stroke="#E3A93A" strokeWidth="6" />
      <path
        d="M30 5 V33"
        stroke="#2E5561"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M5.5 13.5 A 15 15 0 0 1 26 5.5"
        stroke="#DE5A2C"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
