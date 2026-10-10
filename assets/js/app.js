(function boot() {
  const products = window.STAND_PRODUCTS || [];
  const images = window.STAND_IMAGES || {};
  const Domain = window.StandDomain;
  const Storage = window.StandStorage;
  const Cloud = window.StandCloud;
  const shows = window.STAND_SHOWS || [];
  const showMeta = window.STAND_SHOWS_META || {};

  let state = Domain.normalizeState(Storage.load());
  let undoStack = [];
  let selectedProduct = null;
  let selectedVariants = {};
  let selectedQuantity = 1;
  let selectedPayment = "Efectivo";

  const productGrid = document.getElementById("productGrid");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const cartWarning = document.getElementById("cartWarning");
  const chargeBtn = document.getElementById("chargeBtn");
  const clearCartBtn = document.getElementById("clearCartBtn");
  const undoBtn = document.getElementById("undoBtn");
  const movementList = document.getElementById("movementList");
  const stockList = document.getElementById("stockList");
  const exportMovementsBtn = document.getElementById("exportMovementsBtn");
  const exportStockBtn = document.getElementById("exportStockBtn");
  const offlineStatus = document.getElementById("offlineStatus");
  const toast = document.getElementById("toast");
  const showSelect = document.getElementById("showSelect");
  const showDetail = document.getElementById("showDetail");
  const paymentShow = document.getElementById("paymentShow");
  const cloudStatus = document.getElementById("cloudStatus");
  const cloudLoginForm = document.getElementById("cloudLoginForm");
  const cloudBackupBtn = document.getElementById("cloudBackupBtn");
  const cloudLogoutBtn = document.getElementById("cloudLogoutBtn");
  const cloudError = document.getElementById("cloudError");
  const cloudEmailLinkBtn = document.getElementById("cloudEmailLinkBtn");
  const cloudEmailNotice = document.getElementById("cloudEmailNotice");
  let cloudBusy = false;
  let offlineReady = false;

  const productDialog = document.getElementById("productDialog");
  const dialogCategory = document.getElementById("dialogCategory");
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogImage = document.getElementById("dialogImage");
  const dialogPrice = document.getElementById("dialogPrice");
  const dialogNote = document.getElementById("dialogNote");
  const variantArea = document.getElementById("variantArea");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  const qtyValue = document.getElementById("qtyValue");
  const giftMode = document.getElementById("giftMode");
  const productWarning = document.getElementById("productWarning");
  const addToCartBtn = document.getElementById("addToCartBtn");

  const paymentDialog = document.getElementById("paymentDialog");
  const paymentTitle = document.getElementById("paymentTitle");
  const paymentTotal = document.getElementById("paymentTotal");
  const paymentOptions = document.getElementById("paymentOptions");
  const saleNote = document.getElementById("saleNote");
  const confirmSaleBtn = document.getElementById("confirmSaleBtn");

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function dateLabel(show) {
    if (!show.date) return `${show.publishedDay} ene · año a confirmar`;
    const [year, month, day] = show.date.split("-");
    return `${day}/${month}/${year}`;
  }

  function activeShow() {
    return shows.find((show) => show.id === state.activeShowId) || null;
  }

  function showLabel(show) {
    return show ? `${dateLabel(show)} · ${show.venue} · ${show.title}` : "Sin show asignado";
  }

  function renderShows() {
    showSelect.replaceChildren(new Option("Sin show asignado", ""));
    shows.forEach((show) => showSelect.add(new Option(`${dateLabel(show)} · ${show.city} · ${show.venue}`, show.id)));
    showSelect.value = activeShow() ? state.activeShowId : "";
    const show = activeShow();
    showDetail.textContent = show
      ? `${show.title} · ${show.time} · ${show.city}${show.date ? "" : " · Año pendiente de confirmar"}`
      : `Agenda consultada ${showMeta.checkedAt || ""} · ${shows.length} fechas publicadas`;
  }

  function backupPayload() {
    return { app: "Stand Sindical", exportedAt: new Date().toISOString(), state: Domain.clone(state), products, shows, images };
  }

  function renderCloud() {
    const configured = Cloud.isConfigured();
    const user = Cloud.currentUser();
    cloudStatus.textContent = configured
      ? user ? `Sesión: ${user.email}` : "Ingresá para guardar una copia privada"
      : "Supabase pendiente de conectar";
    cloudLoginForm.hidden = Boolean(user);
    cloudLoginForm.querySelectorAll("input, button").forEach((field) => { field.disabled = !configured || cloudBusy; });
    cloudEmailLinkBtn.disabled = !configured || cloudBusy || !navigator.onLine;
    if (user) cloudEmailNotice.textContent = "";
    cloudBackupBtn.disabled = !user || cloudBusy || !navigator.onLine;
    cloudBackupBtn.textContent = cloudBusy ? "Procesando…" : "Guardar copia en Supabase";
    cloudLogoutBtn.hidden = !user;
    cloudLogoutBtn.disabled = cloudBusy;
  }

  function persist() {
    Storage.save(state);
    render();
  }

  function pushUndo() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 30) undoStack.shift();
    renderUndo();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function updateOfflineStatus() {
    if (!navigator.onLine) {
      offlineStatus.textContent = "Sin conexion";
      return;
    }
    offlineStatus.textContent = offlineReady ? "Offline listo" : "Local";
  }

  function renderUndo() {
    undoBtn.disabled = undoStack.length === 0;
  }

  function imageFor(product) {
    return images[product.imageId] || images["producto-pendiente"];
  }

  function priceLabel(product) {
    return typeof product.price === "number" ? Domain.formatMoney(product.price) : "Precio pendiente";
  }

  function renderProducts() {
    productGrid.innerHTML = "";
    products.forEach((product) => {
      const image = imageFor(product);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "product-card";
      card.innerHTML = `
        <img src="${image.src}" alt="${image.alt}" />
        <span class="product-category">${product.category}</span>
        <strong>${product.name}</strong>
        <span class="product-price">${priceLabel(product)}</span>
        <span class="product-stock">${product.stockLabel}</span>
      `;

      let pressTimer = null;
      let longPressed = false;
      card.addEventListener("pointerdown", () => {
        longPressed = false;
        pressTimer = window.setTimeout(() => {
          longPressed = true;
          openProduct(product, true);
        }, 650);
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
        card.addEventListener(eventName, () => window.clearTimeout(pressTimer));
      });
      card.addEventListener("click", () => {
        if (!longPressed) openProduct(product, false);
      });

      productGrid.appendChild(card);
    });
  }

  function renderCart() {
    const totals = Domain.cartTotals(state.cart);
    cartTotal.textContent = Domain.formatMoney(totals.total);
    cartWarning.textContent = "";
    chargeBtn.disabled = state.cart.length === 0 || totals.hasPendingPrices;

    if (totals.hasPendingPrices) {
      cartWarning.textContent = "Hay productos con precio pendiente. Se pueden marcar como obsequio o completar el precio en datos.";
    } else if (state.cart.some((item) => item.productId === "bufalo-3d")) {
      cartWarning.textContent = "Búfalo 3D figura con stock actual 0; el movimiento quedará registrado para revisión.";
    }

    if (!state.cart.length) {
      cartItems.innerHTML = `<div class="empty-state">Carrito vacío</div>`;
      return;
    }

    cartItems.innerHTML = "";
    state.cart.forEach((item) => {
      const subtotal = typeof item.unitPrice === "number" ? item.unitPrice * item.quantity : null;
      const row = document.createElement("article");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${item.imageSrc}" alt="" />
        <div class="cart-item-main">
          <strong>${item.productName}</strong>
          <span>${item.variantLabel}</span>
          <span>${item.gift ? "Obsequio" : item.priceKnown ? Domain.formatMoney(item.unitPrice) : "Precio pendiente"}</span>
        </div>
        <div class="cart-item-side">
          <div class="mini-stepper">
            <button type="button" data-action="decrease" data-id="${item.id}" aria-label="Restar">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" data-id="${item.id}" aria-label="Sumar">+</button>
          </div>
          <strong>${subtotal === null ? "Pendiente" : Domain.formatMoney(subtotal)}</strong>
          <button type="button" class="link-button" data-action="gift" data-id="${item.id}">${item.gift ? "Quitar obsequio" : "Obsequio"}</button>
          <button type="button" class="link-button danger" data-action="remove" data-id="${item.id}">Quitar</button>
        </div>
      `;
      cartItems.appendChild(row);
    });
  }

  function renderHistory() {
    if (!state.movements.length) {
      movementList.innerHTML = `<div class="empty-state">Todavía no hay movimientos</div>`;
      return;
    }

    movementList.innerHTML = "";
    [...state.movements].reverse().forEach((movement) => {
      const card = document.createElement("article");
      card.className = "movement-card";
      const items = movement.items
        .map((item) => {
          const label = item.gift ? "obsequio" : "venta";
          return `<li>${item.quantity} × ${escapeHtml(item.productName)} · ${escapeHtml(item.variantLabel)} · ${label}</li>`;
        })
        .join("");
      card.innerHTML = `
        <div class="movement-head">
          <div>
            <strong>#${escapeHtml(movement.number)} · ${escapeHtml(Domain.movementTypeLabel(movement.type))}</strong>
            <span>${escapeHtml(movement.localDate || movement.createdAt)}</span>
          </div>
          <strong>${Domain.formatMoney(movement.total)}</strong>
        </div>
        <ul>${items}</ul>
        <p>${escapeHtml(showLabel(movement.show))}</p>
        <p>${escapeHtml(movement.paymentMethod)}${movement.note ? ` · ${escapeHtml(movement.note)}` : ""}</p>
      `;
      movementList.appendChild(card);
    });
  }

  function renderStock() {
    const rows = Domain.stockRows(products, state.movements);
    stockList.innerHTML = "";
    rows.forEach((row) => {
      const card = document.createElement("article");
      card.className = "stock-card";
      const appStock = row.appStock === "" || row.appStock === null ? "Pendiente" : row.appStock;
      const baseStock = row.baseStock === "" || row.baseStock === null ? "Pendiente" : row.baseStock;
      card.innerHTML = `
        <div>
          <strong>${row.product}</strong>
          <span>${row.variant}</span>
        </div>
        <dl>
          <div><dt>Base</dt><dd>${baseStock}</dd></div>
          <div><dt>Mov.</dt><dd>${row.appMovements}</dd></div>
          <div><dt>App</dt><dd>${appStock}</dd></div>
        </dl>
        <p>${row.status}</p>
      `;
      stockList.appendChild(card);
    });
  }

  function render() {
    renderProducts();
    renderCart();
    renderHistory();
    renderStock();
    renderUndo();
    renderShows();
  }

  function openProduct(product, asGift) {
    selectedProduct = product;
    selectedVariants = {};
    selectedQuantity = 1;
    (product.variantGroups || []).forEach((group) => {
      selectedVariants[group.id] = group.values[0] ? group.values[0].id : "";
    });

    const image = imageFor(product);
    dialogCategory.textContent = product.category;
    dialogTitle.textContent = product.name;
    dialogImage.src = image.src;
    dialogImage.alt = image.alt;
    dialogPrice.textContent = priceLabel(product);
    dialogNote.textContent = product.notes.join(" ");
    giftMode.checked = Boolean(asGift);
    qtyValue.textContent = selectedQuantity;
    renderVariantArea();
    renderProductWarning();
    productDialog.showModal();
  }

  function renderVariantArea() {
    variantArea.innerHTML = "";
    (selectedProduct.variantGroups || []).forEach((group) => {
      const wrap = document.createElement("fieldset");
      wrap.className = "variant-group";
      const buttons = group.values
        .map((value) => {
          const selected = selectedVariants[group.id] === value.id;
          const swatch = value.swatch ? `<span class="swatch" style="background:${value.swatch}"></span>` : "";
          return `<button type="button" class="${selected ? "is-selected" : ""}" data-group="${group.id}" data-value="${value.id}">${swatch}${value.label}</button>`;
        })
        .join("");
      wrap.innerHTML = `<legend>${group.label}</legend><div class="variant-buttons">${buttons}</div>`;
      variantArea.appendChild(wrap);
    });
  }

  function renderProductWarning() {
    if (!selectedProduct) return;
    if (!giftMode.checked && selectedProduct.price === null) {
      productWarning.textContent = "Precio pendiente: se puede agregar, pero no confirmar venta hasta cargar precio o marcar obsequio.";
      return;
    }
    if (selectedProduct.id === "bufalo-3d") {
      productWarning.textContent = "Stock actual declarado: 0. El registro queda marcado para revisar.";
      return;
    }
    productWarning.textContent = "";
  }

  function updateCartItem(id, updater) {
    pushUndo();
    state.cart = state.cart
      .map((item) => {
        if (item.id !== id) return item;
        return updater(item);
      })
      .filter(Boolean);
    persist();
  }

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tab));
    });
  });

  document.querySelector("[data-close-dialog]").addEventListener("click", () => productDialog.close());
  document.querySelector("[data-close-payment]").addEventListener("click", () => paymentDialog.close());

  variantArea.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-group]");
    if (!button) return;
    selectedVariants[button.dataset.group] = button.dataset.value;
    renderVariantArea();
  });

  qtyMinus.addEventListener("click", () => {
    selectedQuantity = Math.max(1, selectedQuantity - 1);
    qtyValue.textContent = selectedQuantity;
  });

  qtyPlus.addEventListener("click", () => {
    selectedQuantity += 1;
    qtyValue.textContent = selectedQuantity;
  });

  giftMode.addEventListener("change", renderProductWarning);

  addToCartBtn.addEventListener("click", () => {
    const image = imageFor(selectedProduct);
    const item = Domain.makeCartItem({
      product: selectedProduct,
      image,
      selectedVariants,
      quantity: selectedQuantity,
      gift: giftMode.checked,
    });
    pushUndo();
    state.cart = [...state.cart, item];
    persist();
    productDialog.close();
    showToast(item.gift ? "Obsequio agregado" : "Producto agregado");
  });

  cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    const product = products.find((item) => item.id === state.cart.find((cartItem) => cartItem.id === id)?.productId);

    if (action === "increase") {
      updateCartItem(id, (item) => ({ ...item, quantity: item.quantity + 1 }));
    }

    if (action === "decrease") {
      updateCartItem(id, (item) => (item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : null));
    }

    if (action === "remove") {
      updateCartItem(id, () => null);
    }

    if (action === "gift") {
      updateCartItem(id, (item) => {
        const gift = !item.gift;
        const unitPrice = gift ? 0 : typeof product.price === "number" ? product.price : null;
        return { ...item, gift, unitPrice, priceKnown: gift || typeof product.price === "number" };
      });
    }
  });

  clearCartBtn.addEventListener("click", () => {
    if (!state.cart.length) return;
    pushUndo();
    state.cart = [];
    persist();
    showToast("Carrito vaciado");
  });

  chargeBtn.addEventListener("click", () => {
    const totals = Domain.cartTotals(state.cart);
    if (!state.cart.length || totals.hasPendingPrices) return;
    selectedPayment = totals.total === 0 ? "Obsequio" : "Efectivo";
    paymentTitle.textContent = totals.total === 0 ? "Obsequio" : "Venta";
    paymentTotal.textContent = Domain.formatMoney(totals.total);
    saleNote.value = "";
    paymentShow.textContent = showLabel(activeShow());
    paymentOptions.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.payment === selectedPayment);
    });
    paymentDialog.showModal();
  });

  paymentOptions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-payment]");
    if (!button) return;
    selectedPayment = button.dataset.payment;
    paymentOptions.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
  });

  confirmSaleBtn.addEventListener("click", () => {
    try {
      pushUndo();
      state = Domain.confirmCart(state, { paymentMethod: selectedPayment, note: saleNote.value, show: activeShow() });
      persist();
      paymentDialog.close();
      showToast("Movimiento confirmado");
    } catch (error) {
      showToast(error.message);
    }
  });

  undoBtn.addEventListener("click", () => {
    const previous = undoStack.pop();
    if (!previous) return;
    state = Domain.normalizeState(JSON.parse(previous));
    persist();
    showToast("Ultima accion deshecha");
  });

  exportMovementsBtn.addEventListener("click", () => {
    Storage.downloadText(`stand-sindical-movimientos-${Date.now()}.csv`, Domain.movementsToCsv(state.movements), "text/csv;charset=utf-8");
  });

  exportStockBtn.addEventListener("click", () => {
    Storage.downloadText(`stand-sindical-stock-${Date.now()}.csv`, Domain.stockToCsv(products, state.movements), "text/csv;charset=utf-8");
  });

  showSelect.addEventListener("change", () => {
    pushUndo();
    state.activeShowId = showSelect.value;
    persist();
  });

  document.getElementById("downloadBackupBtn").addEventListener("click", () => {
    Storage.downloadText(`stand-sindical-copia-${Date.now()}.json`, JSON.stringify(backupPayload(), null, 2), "application/json");
  });

  cloudLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (cloudBusy) return;
    cloudBusy = true;
    cloudError.textContent = "";
    const passwordField = document.getElementById("cloudPassword");
    const email = document.getElementById("cloudEmail").value.trim();
    const password = passwordField.value;
    passwordField.value = "";
    renderCloud();
    try {
      await Cloud.signIn(email, password);
    } catch (error) {
      cloudError.textContent = error.message;
    } finally {
      cloudBusy = false;
      renderCloud();
    }
  });

  cloudEmailLinkBtn.addEventListener("click", async () => {
    const emailField = document.getElementById("cloudEmail");
    if (cloudBusy || !emailField.reportValidity()) return;
    cloudBusy = true;
    cloudError.textContent = "";
    cloudEmailNotice.textContent = "Enviando enlace...";
    renderCloud();
    try {
      await Cloud.sendEmailLink(emailField.value.trim());
      cloudEmailNotice.textContent = "Si el correo está habilitado, recibirás un enlace de acceso. Revisá también Spam. No compartas ese enlace.";
    } catch (error) {
      cloudEmailNotice.textContent = "";
      cloudError.textContent = error.message;
    } finally {
      cloudBusy = false;
      renderCloud();
    }
  });

  cloudBackupBtn.addEventListener("click", async () => {
    if (cloudBusy) return;
    cloudBusy = true;
    cloudError.textContent = "";
    renderCloud();
    try {
      const result = await Cloud.saveBackup(backupPayload(), Storage.deviceId());
      document.getElementById("cloudLastBackup").textContent = `Copia confirmada: ${new Date(result.created_at).toLocaleString("es-AR")}`;
      showToast("Copia guardada en Supabase");
    } catch (error) {
      cloudError.textContent = error.message;
    } finally {
      cloudBusy = false;
      renderCloud();
    }
  });

  cloudLogoutBtn.addEventListener("click", async () => {
    cloudBusy = true;
    renderCloud();
    try {
      await Cloud.signOut();
    } catch (error) {
      cloudError.textContent = "Sesión local cerrada. El cierre remoto no pudo confirmarse.";
    } finally {
      cloudBusy = false;
      renderCloud();
    }
  });

  window.addEventListener("online", () => {
    updateOfflineStatus();
    renderCloud();
  });
  window.addEventListener("offline", () => {
    updateOfflineStatus();
    renderCloud();
  });
  updateOfflineStatus();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        offlineReady = true;
        updateOfflineStatus();
      })
      .catch(() => {
        offlineStatus.textContent = "Offline requiere HTTP";
      });
  }

  render();
  renderCloud();

  const authFragment = window.location.hash;
  const authParams = new URLSearchParams(authFragment.slice(1));
  if (authParams.has("access_token") || authParams.has("error") || authParams.has("error_code")) {
    // Retirar credenciales de la dirección; nunca se guardan junto a los movimientos.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    document.querySelector('[data-tab="resguardo"]').click();
    cloudBusy = true;
    renderCloud();
    Cloud.completeEmailSignIn(authFragment)
      .catch((error) => { cloudError.textContent = error.message; })
      .finally(() => { cloudBusy = false; renderCloud(); });
  }
})();
