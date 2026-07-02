// =====================================================
// 共通暗号関連関数（暗号化・復号どちらでも使用）
// =====================================================

const ITERATIONS = 600_000; // OWASP 2025推奨値（PBKDF2-HMAC-SHA256）
const IV_SIZE = 12;         // AES-GCMは12byteが標準
const DUMMY_SALT = new Uint8Array(16); // 単一ページ内共通パスフレーズのため固定値でOK

function bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

async function deriveKey(password, usage) {
    if (!password) throw new Error("パスフレーズを入力してください");
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: DUMMY_SALT, iterations: ITERATIONS, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        [usage] // "encrypt" または "decrypt"
    );
}

async function getEncryptedData(originalData, password) {
    if (!originalData || !password) throw new Error("パスフレーズと平文両方を入力してください");
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await deriveKey(password, "encrypt");
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(originalData));
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bufToBase64(combined.buffer);
}

async function getOriginalData(encryptedData, password) {
    if (!encryptedData || !password) throw new Error("パスフレーズと暗号文両方を入力してください");
    const combined = new Uint8Array(base64ToBuf(encryptedData));
    const iv = combined.slice(0, IV_SIZE);
    const ciphertext = combined.slice(IV_SIZE);
    const key = await deriveKey(password, "decrypt");
    try {
        const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
        return new TextDecoder().decode(plainBuf);
    } catch (e) {
        throw new Error("復号に失敗しました。パスフレーズを確認してください。");
    }
}