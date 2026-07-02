// =====================================================
// config.js 生成専用関数
// =====================================================

// "type,label,value" を分割。valueにカンマが含まれても壊れないよう、
// 最初の2つのカンマだけで区切り、残りは全てvalueとして扱う
function parseCsvLine(line) {
    const first = line.indexOf(',');
    const second = line.indexOf(',', first + 1);
    if (first === -1 || second === -1) return null;
    return {
        type: line.slice(0, first).trim(),
        label: line.slice(first + 1, second).trim(),
        value: line.slice(second + 1).trim()
    };
}

function escapeForJs(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function generate() {
    const errorEl = document.getElementById('errorMsg');
    errorEl.textContent = '';

    const passphrase = document.getElementById('passphrase').value;
    const csvText = document.getElementById('csvInput').value.trim();

    if (!passphrase) {
        errorEl.textContent = 'パスフレーズを入力してください';
        return;
    }
    if (!csvText) {
        errorEl.textContent = 'CSVを貼り付けてください';
        return;
    }

    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
    const entries = [];

    for (const [i, line] of lines.entries()) {
        const parsed = parseCsvLine(line);
        if (!parsed || !['button', 'href'].includes(parsed.type)) {
            errorEl.textContent = `${i + 1}行目の形式が不正です: "${line}"`;
            return;
        }
        entries.push(parsed);
    }

    const results = [];
    for (const entry of entries) {
        let value = await getEncryptedData(entry.value, passphrase);
        results.push(`    { type: '${entry.type}', label: '${escapeForJs(entry.label)}', value: '${escapeForJs(value)}' }`);
    }

    const output = `const MASTER_DATA = [\n${results.join(',\n')}\n];\n`;
    document.getElementById('result').value = output;
}

function download() {
    const content = document.getElementById('result').value;
    if (!content) {
        document.getElementById('errorMsg').textContent = '先に生成してください';
        return;
    }
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.js';
    a.click();
    URL.revokeObjectURL(url);
}