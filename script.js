gsap.registerPlugin(ScrollTrigger);

// Анимация карточек: вылетают снизу по очереди
gsap.to(".card-wrapper", {
  scrollTrigger: {
    trigger: ".about-section",
    start: "top 80%", // Начинается, когда секция на 80% в видимости
  },
  opacity: 1,
  y: 0,
  duration: 1,
  stagger: 0.2, // Задержка между карточками
  ease: "power2.out",
});
document.querySelectorAll(".faq-header").forEach((header) => {
  header.addEventListener("click", () => {
    const parent = header.parentElement;
    const content = parent.querySelector(".faq-content");
    const isActive = parent.classList.contains("active");

    // Закрываем все остальные открытые табы
    document.querySelectorAll(".faq-item").forEach((item) => {
      if (item !== parent && item.classList.contains("active")) {
        item.classList.remove("active");
        gsap.to(item.querySelector(".faq-content"), {
          height: 0,
          duration: 0.4,
          ease: "power2.inOut",
        });
      }
    });

    // Переключаем текущий
    parent.classList.toggle("active");

    if (parent.classList.contains("active")) {
      gsap.to(content, {
        height: "auto",
        duration: 0.5,
        ease: "power2.out",
      });
    } else {
      gsap.to(content, {
        height: 0,
        duration: 0.4,
        ease: "power2.inOut",
      });
    }
  });
});
// Простая логика корзины
let cartCount = 0;
const countElement = document.querySelector(".cart-count");

document.querySelectorAll(".add-to-cart").forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault(); // Чтобы не переходило по ссылке

    // Анимация кнопки
    button.innerText = "ДОБАВЛЕНО";
    button.style.background = "#3c2a28";

    // Обновление счетчика
    cartCount++;
    countElement.innerText = cartCount;

    // Возвращаем текст кнопки через секунду
    setTimeout(() => {
      button.innerText = "В КОРЗИНУ";
      button.style.background = "";
    }, 1500);

    // Эффект "прыжка" иконки корзины
    gsap.to(".cart-icon", { scale: 1.2, duration: 0.1, yoyo: true, repeat: 1 });
  });
});
// Анимация появления карточек магазина
gsap.from(".shop-card", {
  scrollTrigger: {
    trigger: ".shop",
    start: "top 80%", // Начнется, когда верх секции дойдет до 80% экрана
  },
  y: 100,
  opacity: 0,
  duration: 1,
  stagger: 0.2, // Появятся по очереди
  ease: "power2.out",
});
// --- НАСТРОЙКИ ШАРОВ ---
const BALL_SETTINGS = {
  radius: 80, // Базовый радиус шара (для ПК)
  mobileRadius: 40, // Радиус для мобилок (экран < 768px)
  restitution: 0.7, // Прыгучесть (от 0 до 1)
  friction: 0.05, // Трение
  imageScale: 0.22, // МАСШТАБ КАРТИНКИ (регулируй, чтобы фото вписалось в круг)
  mobileImageScale: 0.17, // Масштаб спрайтов на мобилках
};

let engine, render, runner;
let hasStarted = false;

function initPhysics() {
  const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } =
    Matter;

  engine = Engine.create();
  const world = engine.world; // Определяем world сразу
  const container = document.getElementById("physics-container");

  const isMobile = window.innerWidth <= 768;
  const currentRadius = isMobile
    ? BALL_SETTINGS.mobileRadius
    : BALL_SETTINGS.radius;
  const currentImageScale = isMobile
    ? BALL_SETTINGS.mobileImageScale
    : BALL_SETTINGS.imageScale;

  render = Render.create({
    element: container,
    engine: engine,
    options: {
      width: container.clientWidth,
      height: container.clientHeight,
      wireframes: false,
      background: "transparent",
    },
  });

  // --- ГРАНИЦЫ ---
  const floor = Bodies.rectangle(
    render.options.width / 2,
    render.options.height + 25,
    render.options.width,
    50,
    { isStatic: true }
  );
  const wallLeft = Bodies.rectangle(
    -25,
    render.options.height / 2,
    50,
    render.options.height,
    { isStatic: true }
  );
  const wallRight = Bodies.rectangle(
    render.options.width + 25,
    render.options.height / 2,
    50,
    render.options.height,
    { isStatic: true }
  );

  // --- 1. СОЗДАНИЕ SVG ФИГУР (ДЕКОР — пойдет на задний план) ---
  const svgFiles = [
    "img/Group 39746-1.svg",
    "img/Group 39735.svg",
    "img/Group 39746.svg",
  ];
  const svgBodies = svgFiles.map((src, i) => {
    const size = currentRadius * 2;
    return Bodies.rectangle(
      render.options.width / 2 + (i * 80 - 40),
      -300 - i * 150,
      size,
      size,
      {
        label: "decorShape",
        restitution: 0.5,
        render: {
          sprite: {
            texture: src,
            xScale: currentImageScale * 4,
            yScale: currentImageScale * 4,
          },
        },
      }
    );
  });

  // --- 2. СОЗДАНИЕ ШАРОВ С ФОТО (ПЕРЕДНИЙ ПЛАН) ---
  const images = ["img/Rus.png", "img/Liza.png", "img/Amina.png"];
  const balls = images.map((src, i) => {
    return Bodies.circle(
      render.options.width / 2 + (i * 60 - 60),
      -100 - i * 150,
      currentRadius,
      {
        label: "photoCircle", // Метка для сортировки
        restitution: BALL_SETTINGS.restitution,
        friction: BALL_SETTINGS.friction,
        render: {
          sprite: {
            texture: src,
            xScale: currentImageScale,
            yScale: currentImageScale,
          },
        },
      }
    );
  });

  // --- НАСТРОЙКА МЫШИ ---
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });

  // Чтобы не мешало скроллу
  mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
  mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

  // --- ДОБАВЛЯЕМ В МИР ---
  // Добавляем сначала стены, потом декор, потом фото.
  // В Matter.js те, кто добавлен позже, рисуются выше.
  Composite.add(world, [
    floor,
    wallLeft,
    wallRight,
    ...svgBodies,
    ...balls,
    mouseConstraint,
  ]);

  // Финальный штрих: принудительная сортировка тел по их меткам (labels)
  world.bodies.sort((a, b) => {
    if (a.label === "photoCircle") return 1;
    if (b.label === "photoCircle") return -1;
    return 0;
  });

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);
}

// Запуск при скролле
ScrollTrigger.create({
  trigger: ".creators",
  start: "top 70%",
  onEnter: () => {
    if (!hasStarted) {
      initPhysics();
      hasStarted = true;
    }
  },
});

// 1. Регистрируем плагин (обязательно, раз ты добавил его в head)
gsap.registerPlugin(ScrollToPlugin);

// 2. Бургер-меню (только для мобильной вёрстки)
const toggleBtn = document.getElementById("toggleBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

function closeDropdown() {
  if (!dropdownMenu) return;
  dropdownMenu.classList.remove("open");
  dropdownMenu.setAttribute("aria-hidden", "true");
  if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
}

function toggleDropdown() {
  if (!dropdownMenu) return;
  const isOpen = dropdownMenu.classList.toggle("open");
  dropdownMenu.setAttribute("aria-hidden", String(!isOpen));
  if (toggleBtn) toggleBtn.setAttribute("aria-expanded", String(isOpen));
}

if (toggleBtn && dropdownMenu) {
  closeDropdown();
  toggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDropdown();
  });

  document.addEventListener("click", (e) => {
    if (!dropdownMenu.classList.contains("open")) return;
    if (dropdownMenu.contains(e.target)) return;
    if (toggleBtn.contains(e.target)) return;
    closeDropdown();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });
}

// 3. Находим все ссылки навигации
const navLinks = document.querySelectorAll(".nav-item");

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault(); // Отменяем резкий прыжок

    // Получаем ID секции из атрибута href (например, "#about")
    const targetId = link.getAttribute("href");

    // Плавная анимация скролла через GSAP
    gsap.to(window, {
      duration: 1.2, // Длительность анимации в секундах
      scrollTo: {
        y: targetId,
        offsetY: 80, // Отступ сверху, чтобы шапка не закрывала заголовок
      },
      ease: "power4.out", // Тип плавности (быстрый старт, мягкое замедление)
    });

    // Закрываем мобильное меню после выбора пункта
    closeDropdown();
  });
});

// Фиксируем первый экран, чтобы второй наезжал на него
ScrollTrigger.create({
  trigger: ".hero", // ЗАМЕНИ на ID или класс твоего первого экрана (где главный заголовок)
  start: "top top", // Начинаем фиксировать, когда верх блока касается верха экрана

  end: "bottom top", // Отпускаем первый экран, когда НИЗ секции с карточками коснется ВЕРХА экрана
  pin: true, // Прикалываем блок
  pinSpacing: false, // ВАЖНО: убираем отступ внизу, что позволяет следующему блоку наехать сверху
});
// Фиксируем первый экран, чтобы второй наезжал на него
ScrollTrigger.create({
  trigger: "#voices", // ЗАМЕНИ на ID или класс твоего первого экрана (где главный заголовок)
  start: "top top", // Начинаем фиксировать, когда верх блока касается верха экрана

  pin: true, // Прикалываем блок
  pinSpacing: false, // ВАЖНО: убираем отступ внизу, что позволяет следующему блоку наехать сверху
});
ScrollTrigger.create({
  trigger: ".creators", // ЗАМЕНИ на ID или класс твоего первого экрана (где главный заголовок)
  start: "top top", // Начинаем фиксировать, когда верх блока касается верха экрана
  pin: true, // Прикалываем блок
  pinSpacing: false, // ВАЖНО: убираем отступ внизу, что позволяет следующему блоку наехать сверху
});
