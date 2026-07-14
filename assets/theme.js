/* iMobile Accessories — theme.js */
(function () {
  'use strict';
  var motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var money = function (cents) {
    try { return (window.Shopify && Shopify.currency ? '' : '') + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 }); }
    catch (e) { return (cents / 100).toFixed(2); }
  };

  /* ---------- Mobile nav ---------- */
  function toggle(el, open) { if (el) el.classList.toggle('is-open', open); }
  var nav = $('#mobileNav'), overlay = $('#overlay');
  $$('[data-nav-open]').forEach(function (b) { b.addEventListener('click', function () { toggle(nav, true); toggle(overlay, true); }); });
  function closeNav() { toggle(nav, false); toggle(drawer, false); toggle(overlay, false); }
  $$('[data-nav-close]').forEach(function (b) { b.addEventListener('click', closeNav); });
  if (overlay) overlay.addEventListener('click', closeNav);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });

  /* ---------- Header scroll + back to top ---------- */
  var header = $('.header'), toTop = $('#toTop');
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 20);
    if (toTop) toTop.classList.toggle('show', y > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: motionOk ? 'smooth' : 'auto' }); });

  /* ---------- Reveal on scroll ---------- */
  if (motionOk && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    function bind() { $$('.reveal:not(.in), .stagger:not(.in)').forEach(function (el) { io.observe(el); }); }
    bind();
    document.addEventListener('shopify:section:load', bind);
    setTimeout(function () { $$('.reveal:not(.in), .stagger:not(.in)').forEach(function (el) { el.classList.add('in'); }); }, 2600);
  } else {
    $$('.reveal, .stagger').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Hero rotating word ---------- */
  var rot = $('[data-rotate]');
  if (rot && motionOk) {
    var words = (rot.getAttribute('data-rotate') || '').split(',').map(function (w) { return w.trim(); }).filter(Boolean);
    if (words.length > 1) {
      var i = 0;
      setInterval(function () {
        i = (i + 1) % words.length;
        rot.style.transition = 'opacity .25s, transform .25s';
        rot.style.opacity = '0'; rot.style.transform = 'translateY(6px)';
        setTimeout(function () { rot.textContent = words[i]; rot.style.opacity = '1'; rot.style.transform = 'none'; }, 260);
      }, 2200);
    }
  }

  /* ---------- Quantity steppers ---------- */
  document.addEventListener('click', function (e) {
    var dec = e.target.closest('[data-qty-dec]'), inc = e.target.closest('[data-qty-inc]');
    if (!dec && !inc) return;
    var wrap = e.target.closest('.qty'); if (!wrap) return;
    var input = wrap.querySelector('input');
    var v = parseInt(input.value, 10) || 1;
    input.value = dec ? Math.max(1, v - 1) : v + 1;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ---------- Product gallery thumbs ---------- */
  $$('[data-gallery]').forEach(function (g) {
    var main = g.querySelector('[data-gallery-main] img');
    g.querySelectorAll('[data-thumb]').forEach(function (t) {
      t.addEventListener('click', function () {
        if (main) main.src = t.getAttribute('data-full');
        g.querySelectorAll('[data-thumb]').forEach(function (x) { x.classList.remove('is-active'); });
        t.classList.add('is-active');
      });
    });
  });

  /* ---------- Variant picker ---------- */
  $$('[data-product-form]').forEach(function (form) {
    var data = form.querySelector('[data-variants]');
    if (!data) return;
    var variants = JSON.parse(data.textContent || '[]');
    var selects = form.querySelectorAll('[data-option]');
    var idInput = form.querySelector('[name="id"]');
    var priceEl = document.querySelector('[data-price-now]');
    var addBtn = form.querySelector('[data-add]');
    function update() {
      var chosen = Array.prototype.map.call(selects, function (s) { return s.value; });
      var match = variants.find(function (v) { return v.options.join('~~') === chosen.join('~~'); });
      if (!match) return;
      idInput.value = match.id;
      if (priceEl) priceEl.textContent = money(match.price);
      if (addBtn) {
        addBtn.disabled = !match.available;
        addBtn.textContent = match.available ? addBtn.getAttribute('data-label') || 'Add to Cart' : 'Sold Out';
      }
    }
    selects.forEach(function (s) { s.addEventListener('change', update); });
    update();
  });

  /* ---------- Cart drawer + AJAX add ---------- */
  var drawer = $('#cartDrawer');
  function openDrawer() { toggle(drawer, true); toggle(overlay, true); }
  $$('[data-cart-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); refreshCart(); }); });

  function refreshCart() {
    fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(renderCart).catch(function () {});
  }
  function renderCart(cart) {
    $$('[data-cart-count]').forEach(function (el) { el.textContent = cart.item_count; el.classList.toggle('hidden', cart.item_count === 0); });
    var body = $('[data-drawer-items]');
    if (body) {
      if (!cart.items.length) { body.innerHTML = '<p class="empty">Your cart is empty.</p>'; }
      else {
        body.innerHTML = cart.items.map(function (it) {
          return '<div class="cart-row"><img src="' + (it.image ? it.image.replace(/(\.[^.]+)(\?.*)?$/, '_120x$1') : '') + '" alt=""><div><a href="' + it.url + '">' + it.product_title + '</a><div class="price"><span class="price__now">Rs.' + money(it.final_line_price) + '</span></div><button data-remove="' + it.key + '" class="visually-hidden-btn" style="background:none;border:none;color:#e11d48;font-size:.8rem;padding:4px 0;cursor:pointer">Remove</button></div><div class="qty"><button type="button" data-line-dec="' + it.key + '">−</button><input value="' + it.quantity + '" readonly><button type="button" data-line-inc="' + it.key + '">+</button></div></div>';
        }).join('');
      }
    }
    var totalEl = $('[data-drawer-total]');
    if (totalEl) totalEl.textContent = 'Rs.' + money(cart.total_price);
  }
  function changeLine(key, qty) {
    fetch('/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ id: key, quantity: qty }) })
      .then(function (r) { return r.json(); }).then(renderCart).catch(function () {});
  }
  document.addEventListener('click', function (e) {
    var inc = e.target.closest('[data-line-inc]'), dec = e.target.closest('[data-line-dec]'), rm = e.target.closest('[data-remove]');
    if (inc || dec) {
      var row = e.target.closest('.cart-row'); var input = row.querySelector('input');
      var v = parseInt(input.value, 10) || 1;
      changeLine((inc || dec).getAttribute(inc ? 'data-line-inc' : 'data-line-dec'), inc ? v + 1 : Math.max(0, v - 1));
    }
    if (rm) changeLine(rm.getAttribute('data-remove'), 0);
  });

  $$('[data-product-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.fetch) return; // fallback to normal submit
      e.preventDefault();
      var btn = form.querySelector('[data-add]');
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
      fetch('/cart/add.js', { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form) })
        .then(function (r) { return r.json(); })
        .then(function () { refreshCart(); openDrawer(); })
        .catch(function () { form.submit(); })
        .finally(function () { if (btn) { btn.disabled = false; btn.textContent = orig; } });
    });
  });

  refreshCart();
})();
