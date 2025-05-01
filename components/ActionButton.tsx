export default function ActionButton(
  { text, onClick }: { text: string; onClick?: () => void },
) {
  return <button type="submit" onClick={onClick}>{text}</button>;
}
