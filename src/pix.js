const tlv = (id, s) => id + String(s.length).padStart(2, "0") + s;
export function pixPayload(key, name, city, amount) {
  const clean = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 $%*+\-./:]/g, "");
  let s =
    "000201" +
    tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", key)) +
    "520400005303986" +
    (amount > 0 ? tlv("54", Number(amount).toFixed(2)) : "") +
    "5802BR" +
    tlv("59", clean(name).slice(0, 25)) +
    tlv("60", clean(city).slice(0, 15)) +
    tlv("62", tlv("05", "***")) +
    "6304";
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++)
      crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return s + crc.toString(16).toUpperCase().padStart(4, "0");
}
