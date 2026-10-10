(function attachDomain(global) {
  const currency = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatMoney(value) {
    if (typeof value !== "number") return "Precio pendiente";
    return currency.format(value);
  }

  function createEmptyState() {
    return {
      cart: [],
      movements: [],
      nextMovementNumber: 1,
      activeShowId: "",
    };
  }

  function normalizeState(saved) {
    const empty = createEmptyState();
    if (!saved || typeof saved !== "object") return empty;
    return {
      cart: Array.isArray(saved.cart) ? saved.cart : [],
      movements: Array.isArray(saved.movements) ? saved.movements : [],
      nextMovementNumber: Number.isInteger(saved.nextMovementNumber) ? saved.nextMovementNumber : 1,
      activeShowId: typeof saved.activeShowId === "string" ? saved.activeShowId : "",
    };
  }

  function findVariantValue(product, groupId, valueId) {
    const group = (product.variantGroups || []).find((item) => item.id === groupId);
    return group ? group.values.find((item) => item.id === valueId) : null;
  }

  function getVariantLabel(product, selectedVariants) {
    const labels = (product.variantGroups || []).map((group) => {
      const selected = selectedVariants[group.id] || (group.values[0] && group.values[0].id);
      const value = findVariantValue(product, group.id, selected);
      return value ? value.label : "Sin confirmar";
    });
    return labels.length ? labels.join(" / ") : "Sin variante";
  }

  function makeCartItem({ product, image, selectedVariants, quantity, gift }) {
    const numericQuantity = Math.max(1, Number(quantity) || 1);
    const isGift = Boolean(gift);
    const priceKnown = isGift || typeof product.price === "number";
    const unitPrice = isGift ? 0 : typeof product.price === "number" ? product.price : null;

    return {
      id: makeId("item"),
      productId: product.id,
      productName: product.name,
      category: product.category,
      imageId: product.imageId,
      imageSrc: image ? image.src : "",
      variants: clone(selectedVariants || {}),
      variantLabel: getVariantLabel(product, selectedVariants || {}),
      quantity: numericQuantity,
      gift: isGift,
      unitPrice,
      priceKnown,
      addedAt: new Date().toISOString(),
    };
  }

  function cartTotals(cart) {
    return cart.reduce(
      (acc, item) => {
        const qty = Number(item.quantity) || 0;
        if (!item.gift && item.unitPrice === null) acc.hasPendingPrices = true;
        if (typeof item.unitPrice === "number") acc.total += item.unitPrice * qty;
        acc.quantity += qty;
        acc.giftQuantity += item.gift ? qty : 0;
        return acc;
      },
      { total: 0, quantity: 0, giftQuantity: 0, hasPendingPrices: false }
    );
  }

  function movementType(cart) {
    if (cart.length === 0) return "vacio";
    if (cart.every((item) => item.gift)) return "obsequio";
    if (cart.some((item) => item.gift)) return "venta_mixta";
    return "venta";
  }

  function confirmCart(state, options) {
    const totals = cartTotals(state.cart);
    if (!state.cart.length) throw new Error("El carrito esta vacio.");
    if (totals.hasPendingPrices) throw new Error("Hay productos con precio pendiente.");

    const now = options && options.now ? new Date(options.now) : new Date();
    const movement = {
      id: makeId("mov"),
      number: state.nextMovementNumber || 1,
      createdAt: now.toISOString(),
      localDate: now.toLocaleString("es-AR"),
      type: movementType(state.cart),
      paymentMethod: options && options.paymentMethod ? options.paymentMethod : "Sin especificar",
      note: options && options.note ? options.note.trim() : "",
      total: totals.total,
      items: clone(state.cart),
      show: options && options.show ? clone(options.show) : null,
    };

    return {
      ...state,
      cart: [],
      movements: [...state.movements, movement],
      nextMovementNumber: movement.number + 1,
    };
  }

  function movementTypeLabel(type) {
    const labels = {
      venta: "Venta",
      venta_mixta: "Venta + obsequio",
      obsequio: "Obsequio",
    };
    return labels[type] || type;
  }

  function csvEscape(value) {
    if (value === null || value === undefined) return "";
    const raw = String(value);
    const text = typeof value === "string" && /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
    if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function rowsToCsv(rows) {
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }

  function movementsToCsv(movements) {
    const rows = [
      [
        "fecha",
        "movimiento",
        "tipo",
        "medio_pago",
        "producto",
        "variante",
        "cantidad",
        "obsequio",
        "precio_unitario",
        "subtotal",
        "nota",
        "show_id",
        "fecha_show",
        "titulo_show",
        "ciudad_show",
        "sala_show",
        "fecha_show_estado",
      ],
    ];

    movements.forEach((movement) => {
      movement.items.forEach((item) => {
        const subtotal = typeof item.unitPrice === "number" ? item.unitPrice * item.quantity : "";
        rows.push([
          movement.localDate || movement.createdAt,
          movement.number,
          movementTypeLabel(movement.type),
          movement.paymentMethod,
          item.productName,
          item.variantLabel,
          item.quantity,
          item.gift ? "si" : "no",
          item.unitPrice,
          subtotal,
          movement.note,
          movement.show ? movement.show.id : "",
          movement.show ? movement.show.date || "" : "",
          movement.show ? movement.show.title : "",
          movement.show ? movement.show.city : "",
          movement.show ? movement.show.venue : "",
          movement.show ? movement.show.dateStatus : "sin_show",
        ]);
      });
    });

    return "\ufeff" + rowsToCsv(rows);
  }

  function sumMovedByProduct(movements) {
    const map = new Map();
    movements.forEach((movement) => {
      movement.items.forEach((item) => {
        const productKey = item.productId;
        const variantKey = `${item.productId}||${item.variantLabel}`;
        const quantity = Number(item.quantity) || 0;
        map.set(productKey, (map.get(productKey) || 0) + quantity);
        map.set(variantKey, (map.get(variantKey) || 0) + quantity);
      });
    });
    return map;
  }

  function stockRows(products, movements) {
    const moved = sumMovedByProduct(movements);
    const rows = [];

    products.forEach((product) => {
      const variantGroup = (product.variantGroups || []).find((group) =>
        group.values.some((value) => typeof value.startingStock === "number")
      );

      if (variantGroup) {
        variantGroup.values.forEach((value) => {
          const base = value.startingStock;
          const key = `${product.id}||${value.label}`;
          const movementQty = moved.get(key) || 0;
          rows.push({
            product: product.name,
            variant: value.label,
            baseStock: base,
            appMovements: movementQty,
            appStock: typeof base === "number" ? base - movementQty : null,
            status: product.stockStatus,
            notes: product.notes.join(" "),
          });
        });
        return;
      }

      if (typeof product.countedTotal === "number") {
        const movementQty = moved.get(product.id) || 0;
        rows.push({
          product: product.name,
          variant: "Total contado",
          baseStock: product.countedTotal,
          appMovements: movementQty,
          appStock: product.countedTotal - movementQty,
          status: "requiere conciliación por variantes",
          notes: product.notes.join(" "),
        });
        return;
      }

      rows.push({
        product: product.name,
        variant: "Pendiente",
        baseStock: "",
        appMovements: moved.get(product.id) || 0,
        appStock: "",
        status: "requiere conciliación",
        notes: product.notes.join(" "),
      });
    });

    return rows;
  }

  function stockToCsv(products, movements) {
    const rows = [["producto", "variante", "stock_base", "movimientos_app", "stock_app", "estado", "notas"]];
    stockRows(products, movements).forEach((row) => {
      rows.push([row.product, row.variant, row.baseStock, row.appMovements, row.appStock, row.status, row.notes]);
    });
    return "\ufeff" + rowsToCsv(rows);
  }

  const StandDomain = {
    clone,
    formatMoney,
    createEmptyState,
    normalizeState,
    getVariantLabel,
    makeCartItem,
    cartTotals,
    confirmCart,
    movementTypeLabel,
    movementsToCsv,
    stockRows,
    stockToCsv,
  };

  global.StandDomain = StandDomain;
  if (typeof module !== "undefined" && module.exports) module.exports = StandDomain;
})(typeof window !== "undefined" ? window : globalThis);
