// -------------------------
// PDFマージ
// -------------------------
async function mergePDFs(files, addBlankIfOdd = true) {
    // ファイル1つならそのまま返す
    if (files.length <= 1) {

        const buffer = await files[0].arrayBuffer();
        return await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });

    }

    const mergedPdf = await PDFLib.PDFDocument.create();

    for (const [index, file] of files.entries()) {

        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(buffer,{ignoreEncryption:true});

        const pageCount = pdfDoc.getPageCount();

        const pages = await mergedPdf.copyPages(
            pdfDoc,
            [...Array(pageCount).keys()]
        );

        pages.forEach(p => mergedPdf.addPage(p));

        if (addBlankIfOdd && pageCount % 2 === 1 && index !== files.length - 1) {

            const size = pdfDoc.getPage(0).getSize();
            mergedPdf.addPage([size.width, size.height]);

        }

    }

    return mergedPdf;
}


// -------------------------
// 面付け処理
// -------------------------
async function reorderForDoubleSide(sourcePdf, blockSize = 8) {

    const newPdf = await PDFLib.PDFDocument.create();

    const blockMapping = {
        4: [0,2,3,1],
        8: [0,2,4,6,3,1,7,5]
    };

    const mapping = blockMapping[blockSize];

    const pageCount = sourcePdf.getPageCount();
    const size = sourcePdf.getPage(0).getSize();

    for (let blockStart = 0; blockStart < pageCount; blockStart += blockSize) {

        for (let j = 0; j < blockSize; j++) {

            const index = blockStart + mapping[j];

            if (index < pageCount) {

                const [page] = await newPdf.copyPages(sourcePdf,[index]);
                newPdf.addPage(page);

            } else {

                newPdf.addPage([size.width,size.height]);

            }

        }

    }

    return newPdf;
}


// -------------------------
// PDFダウンロード
// -------------------------
async function downloadPdf(pdfDoc, filename="output.pdf") {

    const bytes = await pdfDoc.save();

    const blob = new Blob([bytes], {type:"application/pdf"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

}