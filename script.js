// Image Compressor — fully client-side using the Canvas API.
// No uploads: every file is processed locally in the browser.

(() => {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const browseBtn = document.getElementById("browseBtn");
  const controls = document.getElementById("controls");
  const results = document.getElementById("results");

  const qualityInput = document.getElementById("quality");
  const qualityValue = document.getElementById("qualityValue");
  const formatSelect = document.getElementById("format");
  const maxWidthInput = document.getElementById("maxWidth");

  const recompressBtn = document.getElementById("recompressBtn");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const clearBtn = document.getElementById("clearBtn");

  // Holds { file, card, blob, originalSize, compressedSize, outName }
  let items = [];

  // ---- Helpers ---------------------------------------------------------

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const extForType = (type) =>
    ({ "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" }[type] || "img");

  const swapExt = (name, ext) => name.replace(/\.[^.]+$/, "") + "." + ext;

  // Load a File into an HTMLImageElement.
  const loadImage = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not load image"));
      };
      img.src = url;
    });

  // Compress one file. Returns { blob, outName }.
  async function compress(file) {
    const img = await loadImage(file);
    const type = formatSelect.value;
    const quality = Number(qualityInput.value) / 100;
    const maxWidth = Number(maxWidthInput.value) || 0;

    let { width, height } = img;
    if (maxWidth > 0 && width > maxWidth) {
      height = Math.round((maxWidth / width) * height);
      width = maxWidth;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // White background for JPEG (which has no alpha channel).
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      // PNG ignores the quality argument; that's fine.
      canvas.toBlob(resolve, type, quality)
    );

    return { blob, outName: swapExt(file.name, extForType(type)) };
  }

  // ---- Rendering -------------------------------------------------------

  function buildCard(file) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-thumb"><div class="spinner"></div></div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(file.name)}</div>
        <div class="stat-row"><span>Original</span><span class="orig">${formatBytes(file.size)}</span></div>
        <div class="stat-row"><span>Compressed</span><span class="comp">…</span></div>
        <div class="stat-row"><span>Saved</span><span class="savings">…</span></div>
      </div>
      <div class="card-actions">
        <button class="btn btn-primary download" disabled>Download</button>
      </div>`;
    results.appendChild(card);
    return card;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  async function processItem(item) {
    const { file, card } = item;
    const thumb = card.querySelector(".card-thumb");
    const compEl = card.querySelector(".comp");
    const savingsEl = card.querySelector(".savings");
    const dlBtn = card.querySelector(".download");

    thumb.innerHTML = '<div class="spinner"></div>';
    dlBtn.disabled = true;

    try {
      const { blob, outName } = await compress(file);
      item.blob = blob;
      item.outName = outName;
      item.compressedSize = blob.size;

      const url = URL.createObjectURL(blob);
      thumb.innerHTML = `<img src="${url}" alt="${escapeHtml(outName)}" />`;

      compEl.textContent = formatBytes(blob.size);
      const saved = file.size - blob.size;
      const pct = file.size ? Math.round((saved / file.size) * 100) : 0;
      if (saved >= 0) {
        savingsEl.textContent = `${formatBytes(saved)} (${pct}%)`;
        savingsEl.style.color = "var(--green)";
      } else {
        savingsEl.textContent = `+${formatBytes(-saved)} (larger)`;
        savingsEl.style.color = "#f59e0b";
      }

      dlBtn.disabled = false;
      dlBtn.onclick = () => downloadBlob(blob, outName);
    } catch (err) {
      thumb.innerHTML = "⚠️";
      compEl.textContent = "failed";
      savingsEl.textContent = err.message;
    }
  }

  function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---- Flows -----------------------------------------------------------

  async function addFiles(fileList) {
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    controls.hidden = false;
    for (const file of imageFiles) {
      const item = { file, card: buildCard(file) };
      items.push(item);
      await processItem(item);
    }
  }

  async function recompressAll() {
    for (const item of items) await processItem(item);
  }

  async function downloadAll() {
    const ready = items.filter((i) => i.blob);
    if (!ready.length) return;
    if (ready.length === 1) {
      downloadBlob(ready[0].blob, ready[0].outName);
      return;
    }
    if (typeof JSZip === "undefined") {
      alert("Zip library still loading — try again in a moment.");
      return;
    }
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = "Zipping…";
    const zip = new JSZip();
    const used = {};
    for (const item of ready) {
      let name = item.outName;
      // Avoid collisions in the zip.
      if (used[name]) name = name.replace(/(\.[^.]+)$/, `-${used[name]++}$1`);
      else used[name] = 1;
      zip.file(name, item.blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "compressed-images.zip");
    downloadAllBtn.disabled = false;
    downloadAllBtn.textContent = "Download all (.zip)";
  }

  function clearAll() {
    items = [];
    results.innerHTML = "";
    controls.hidden = true;
    fileInput.value = "";
  }

  // ---- Events ----------------------------------------------------------

  qualityInput.addEventListener("input", () => {
    qualityValue.textContent = qualityInput.value;
  });

  browseBtn.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("click", (e) => {
    if (e.target === browseBtn) return;
    fileInput.click();
  });
  fileInput.addEventListener("change", (e) => addFiles(e.target.files));

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  recompressBtn.addEventListener("click", recompressAll);
  downloadAllBtn.addEventListener("click", downloadAll);
  clearBtn.addEventListener("click", clearAll);
})();
