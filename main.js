/**
 * Основной скрипт сайта LinguaSchool.
 * Реализует всю интерактивную логику главной страницы.
 */

// Глобальные переменные
let allCourses = [];
let allTutors = [];
let selectedCourse = null;
let selectedTutor = null;
const COURSES_PER_PAGE = 5;

// ======================
// Инициализация при загрузке страницы
// ======================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Загружаем курсы и репетиторов параллельно
    const [courses, tutors] = await Promise.all([
      fetchCourses(),
      fetchTutors()
    ]);

    allCourses = courses;
    allTutors = tutors;

    renderCourses(allCourses);
    populateTutorFilters(tutors);
    renderTutors(tutors);

    // Настраиваем обработчики событий
    setupEventListeners();
  } catch (error) {
    showNotification(`Ошибка загрузки данных: ${error.message}`, 'danger');
  }
});

// ======================
// Настройка обработчиков событий
// ======================
function setupEventListeners() {
  // Поиск курсов
  document.getElementById('courseSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    filterCourses();
  });

  // Фильтрация репетиторов
  document.getElementById('tutorLanguage').addEventListener('change', filterTutors);
  document.getElementById('tutorExperience').addEventListener('input', filterTutors);

  // Отправка заявки
  document.getElementById('submitOrderBtn').addEventListener('click', submitOrder);

  // Обновление расчёта при изменении полей формы
  const orderFields = ['studentsNumber', 'supplementary', 'personalized', 'excursions', 'assessment', 'interactive'];
  orderFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', recalculateTotalPrice);
  });
  document.getElementById('orderDate').addEventListener('change', handleDateChange);
}

// ======================
// Работа с курсами
// ======================

/**
 * Фильтрует курсы по поисковому запросу и уровню.
 */
function filterCourses() {
  const query = document.getElementById('searchCourseInput').value.trim().toLowerCase();
  const level = document.getElementById('searchLevelSelect').value;

  const filtered = allCourses.filter(course => {
    const matchesQuery = course.name.toLowerCase().includes(query) ||
                         course.description.toLowerCase().includes(query);
    const matchesLevel = !level || course.level === level;
    return matchesQuery && matchesLevel;
  });

  renderCourses(filtered);
}

/**
 * Отображает список курсов с пагинацией.
 */
function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  const pagination = document.getElementById('coursesPagination');

  // Очищаем контейнеры
  container.innerHTML = '';
  pagination.innerHTML = '';

  if (courses.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Курсы не найдены.</p>';
    return;
  }

  const totalPages = Math.ceil(courses.length / COURSES_PER_PAGE);
  const currentPage = 1;

  // Показываем первую страницу
  displayCoursesPage(courses, currentPage, totalPages);
  renderPagination(pagination, totalPages, currentPage, (page) => {
    displayCoursesPage(courses, page, totalPages);
  });
}

/**
 * Отображает одну страницу курсов.
 */
function displayCoursesPage(courses, page, totalPages) {
  const start = (page - 1) * COURSES_PER_PAGE;
  const end = start + COURSES_PER_PAGE;
  const pageCourses = courses.slice(start, end);

  const container = document.getElementById('coursesContainer');
  container.innerHTML = pageCourses.map(course => {
    // Рассчитываем минимальную базовую стоимость курса
    const totalHours = course.total_length * course.week_length;
    const minPrice = course.course_fee_per_hour * totalHours;

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${course.name}</h5>
            <p class="card-text flex-grow-1">${course.description}</p>
            <p><small class="text-muted">Преподаватель: ${course.teacher}</small></p>
            <p><small class="text-muted">Уровень: ${course.level} | ${course.total_length} недель</small></p>
            <p class="text-primary fw-bold mt-2">От ${minPrice} ₽</p>
            <button class="btn btn-outline-primary mt-auto" onclick="openOrderModal(${course.id}, 'course')">
              Подать заявку
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Генерирует элементы пагинации.
 */
function renderPagination(container, totalPages, currentPage, onPageChange) {
  if (totalPages <= 1) return;

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }
  container.innerHTML = html;

  // Добавляем обработчики кликов
  container.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(e.target.dataset.page);

      // Убираем active у всех
      container.querySelectorAll('.page-item').forEach(item => {
        item.classList.remove('active');
      });
      // Добавляем active к текущей
      e.target.parentElement.classList.add('active');

      // Вызываем колбэк для загрузки данных
      onPageChange(page);
    });
  });
}

// ======================
// Работа с репетиторами
// ======================

/**
 * Заполняет выпадающий список языков для фильтрации репетиторов.
 */
function populateTutorFilters(tutors) {
  const languageSet = new Set();
  tutors.forEach(tutor => {
    tutor.languages_offered.forEach(lang => languageSet.add(lang));
  });

  const select = document.getElementById('tutorLanguage');
  languageSet.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang;
    option.textContent = lang;
    select.appendChild(option);
  });
}

/**
 * Фильтрует репетиторов по языку и опыту.
 */
function filterTutors() {
  const language = document.getElementById('tutorLanguage').value;
  const experience = document.getElementById('tutorExperience').value;

  const filtered = allTutors.filter(tutor => {
    const matchesLang = !language || tutor.languages_offered.includes(language);
    const matchesExp = !experience || tutor.work_experience >= parseInt(experience);
    return matchesLang && matchesExp;
  });

  renderTutors(filtered);
}

/**
 * Отображает таблицу репетиторов.
 */
function renderTutors(tutors) {
  const tbody = document.getElementById('tutorsTableBody');
  tbody.innerHTML = '';

  if (tutors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Репетиторы не найдены.</td></tr>`;
    return;
  }

  tutors.forEach(tutor => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tutor.name}</td>
      <td>${tutor.language_level}</td>
      <td>${tutor.languages_offered.join(', ')}</td>
      <td>${tutor.work_experience}</td>
      <td>${tutor.price_per_hour} ₽</td>
      <td><img src="https://placehold.co/50x50?text=${tutor.name.charAt(0)}" alt="Фото"></td>
      <td><button class="btn btn-sm btn-outline-success" onclick="selectTutor(${tutor.id})">Выбрать</button></td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Выбирает репетитора и открывает форму заказа.
 */
function selectTutor(tutorId) {
  document.querySelectorAll('#tutorsTableBody tr').forEach(tr => tr.classList.remove('selected'));
  const row = document.querySelector(`#tutorsTableBody tr:nth-child(${allTutors.findIndex(t => t.id === tutorId) + 1})`);
  if (row) row.classList.add('selected');

  selectedTutor = allTutors.find(t => t.id === tutorId);
  selectedCourse = null; // ← ВАЖНО! СБРОСИТЬ КУРС

  openOrderModal(tutorId, 'tutor');
}

// ======================
// Модальное окно заказа
// ======================

/**
 * Открывает модальное окно для оформления заявки.
 */
function openOrderModal(id, type) {
  const modalTitle = document.getElementById('orderModalLabel');
  const orderTitle = document.getElementById('orderTitle');
  const courseIdInput = document.getElementById('selectedCourseId');
  const tutorIdInput = document.getElementById('selectedTutorId');

  if (type === 'course') {
    selectedCourse = allCourses.find(c => c.id === id);
    if (!selectedCourse) return;

    modalTitle.textContent = 'Оформление заявки на курс';
    orderTitle.value = selectedCourse.name;
    courseIdInput.value = selectedCourse.id;
    tutorIdInput.value = ''; // сбрасываем

    populateDateSelect(selectedCourse.start_dates);
  } else if (type === 'tutor') {
    selectedTutor = allTutors.find(t => t.id === id);
    if (!selectedTutor) return;

    modalTitle.textContent = 'Оформление заявки на репетитора';
    orderTitle.value = `Репетитор: ${selectedTutor.name}`;
    tutorIdInput.value = selectedTutor.id;
    courseIdInput.value = ''; // сбрасываем

    // Для репетитора — упрощённая форма: дата сегодняшняя, время любое
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('orderDate').innerHTML = `<option value="${today}">${today}</option>`;
    document.getElementById('orderTime').innerHTML = `
      <option value="09:00">09:00</option>
      <option value="12:00">12:00</option>
      <option value="15:00">15:00</option>
      <option value="18:00">18:00</option>
    `;
    document.getElementById('orderTime').disabled = false;
    document.getElementById('orderDuration').value = 1; 
  document.getElementById('orderDuration').readOnly = false; // можно менять
  }

  // Сбрасываем чекбоксы и количество студентов
  document.getElementById('studentsNumber').value = 1;
  ['supplementary', 'personalized', 'excursions', 'assessment', 'interactive'].forEach(id => {
    document.getElementById(id).checked = false;
  });

  recalculateTotalPrice();
  const modal = new bootstrap.Modal(document.getElementById('orderModal'));
  modal.show();
}

/**
 * Заполняет выпадающий список дат на основе данных курса.
 */
function populateDateSelect(startDates) {
  const select = document.getElementById('orderDate');
  select.innerHTML = '<option value="">Выберите дату</option>';

  const uniqueDates = [...new Set(startDates.map(d => d.split('T')[0]))];
  uniqueDates.sort().forEach(date => {
    const option = document.createElement('option');
    option.value = date;
    option.textContent = date;
    select.appendChild(option);
  });

  document.getElementById('orderTime').disabled = true;
  document.getElementById('orderTime').innerHTML = '<option value="">Сначала выберите дату</option>';
}

/**
 * Обрабатывает выбор даты — заполняет время.
 */
function handleDateChange() {
  const selectedDate = document.getElementById('orderDate').value;
  const timeSelect = document.getElementById('orderTime');

  if (!selectedDate || !selectedCourse) {
    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
    document.getElementById('orderDuration').value = '';
    return;
  }

  // Находим все временные метки для этой даты
  const times = selectedCourse.start_dates
    .filter(dt => dt.startsWith(selectedDate))
    .map(dt => dt.split('T')[1].substring(0, 5)); // "HH:MM"

  timeSelect.innerHTML = '';
  times.forEach(time => {
    const option = document.createElement('option');
    option.value = time;
    option.textContent = time;
    timeSelect.appendChild(option);
  });
  timeSelect.disabled = false;

  // Рассчитываем и устанавливаем продолжительность
  const totalHours = selectedCourse.total_length * selectedCourse.week_length;
  const endDate = new Date(selectedDate);
  endDate.setDate(endDate.getDate() + selectedCourse.total_length * 7);
  document.getElementById('orderDuration').value = `${totalHours} часов (до ${endDate.toISOString().split('T')[0]})`;

  recalculateTotalPrice();
}
// ======================
// Расчёт стоимости
// ======================

/**
 * Пересчитывает итоговую стоимость заявки.
 */
function recalculateTotalPrice() {
  if (selectedCourse) {
    calculateCoursePrice();
  } else if (selectedTutor) {
    calculateTutorPrice();
  }
}

/**
 * Рассчитывает стоимость для курса.
 */
function calculateCoursePrice() {
  const students = parseInt(document.getElementById('studentsNumber').value) || 1;
  const date = document.getElementById('orderDate').value;
  const time = document.getElementById('orderTime').value;

  if (!date || !time) {
    document.getElementById('totalPrice').textContent = '—';
    return;
  }

  // Базовая стоимость
  const totalHours = selectedCourse.total_length * selectedCourse.week_length;
  let basePrice = selectedCourse.course_fee_per_hour * totalHours;

  // Множитель выходных
  const dayOfWeek = new Date(date).getDay(); // 0 — воскресенье, 6 — суббота
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekendMultiplier = isWeekend ? 1.5 : 1;
  basePrice *= weekendMultiplier;

  // Доплаты за время
  let morningSurcharge = 0;
  let eveningSurcharge = 0;
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 9 && hour < 12) morningSurcharge = 400;
  if (hour >= 18 && hour < 20) eveningSurcharge = 1000;

  let totalPrice = (basePrice + morningSurcharge + eveningSurcharge) * students;

  // Дополнительные опции
  if (document.getElementById('supplementary').checked) totalPrice += 2000 * students;
  if (document.getElementById('personalized').checked) totalPrice += 1500 * selectedCourse.total_length;
  if (document.getElementById('excursions').checked) totalPrice *= 1.25;
  if (document.getElementById('assessment').checked) totalPrice += 300;
  if (document.getElementById('interactive').checked) totalPrice *= 1.5;

  // Скидки
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const isEarly = new Date(date) >= oneMonthLater;
  if (isEarly) totalPrice *= 0.9; // -10%

  if (students >= 5) totalPrice *= 0.85; // -15%

  if (selectedCourse.week_length >= 5) totalPrice *= 1.2; // +20%

  document.getElementById('totalPrice').textContent = Math.round(totalPrice);
}

/**
 * Рассчитывает стоимость для репетитора.
 */
function calculateTutorPrice() {
  const students = parseInt(document.getElementById('studentsNumber').value) || 1;
  const duration = parseInt(document.getElementById('orderDuration').value) || 1;

  let totalPrice = selectedTutor.price_per_hour * duration * students;

  // Дополнительные опции
  if (document.getElementById('supplementary').checked) totalPrice += 2000 * students;
  if (document.getElementById('personalized').checked) totalPrice += 1500;
  if (document.getElementById('excursions').checked) totalPrice *= 1.25;
  if (document.getElementById('assessment').checked) totalPrice += 300;
  if (document.getElementById('interactive').checked) totalPrice *= 1.5;

  // Скидки
  if (students >= 5) totalPrice *= 0.85;

  document.getElementById('totalPrice').textContent = Math.round(totalPrice);
}

// ======================
// Отправка заявки
// ======================

async function submitOrder() {
  const students = parseInt(document.getElementById('studentsNumber').value);
  const date = document.getElementById('orderDate').value;
  const time = document.getElementById('orderTime').value;

  if (!selectedCourse && !selectedTutor) {
    showNotification('Не выбран курс или репетитор', 'warning');
    return;
  }

  if (selectedCourse && (!date || !time)) {
    showNotification('Выберите дату и время', 'warning');
    return;
  }

  const orderData = {
    persons: students,
    early_registration: false,
    group_enrollment: students >= 5,
    intensive_course: selectedCourse ? selectedCourse.week_length >= 5 : false,
    supplementary: document.getElementById('supplementary').checked,
    personalized: document.getElementById('personalized').checked,
    excursions: document.getElementById('excursions').checked,
    assessment: document.getElementById('assessment').checked,
    interactive: document.getElementById('interactive').checked,
    price: parseInt(document.getElementById('totalPrice').textContent)
  };

  if (selectedCourse) {
    orderData.course_id = selectedCourse.id;
    orderData.date_start = date;
    orderData.time_start = time;
    orderData.duration = selectedCourse.total_length * selectedCourse.week_length; // ← ВАЖНО!
  } else if (selectedTutor) {
    orderData.tutor_id = selectedTutor.id;
    orderData.date_start = new Date().toISOString().split('T')[0];
    orderData.time_start = time || '09:00';
    orderData.duration = parseInt(document.getElementById('orderDuration').value) || 1;
  }

  try {
    await createOrder(orderData);
    showNotification('Заявка успешно отправлена!', 'success');
    const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
    modal.hide();

  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, 'danger');
  }
}

// ======================
// Уведомления
// ======================

/**
 * Показывает всплывающее уведомление.
 */
function showNotification(message, type = 'info') {
  const container = document.getElementById('notifications');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  container.appendChild(alert);

  // Автоматическое удаление через 5 секунд
  setTimeout(() => {
    if (alert.parentNode === container) {
      container.removeChild(alert);
    }
  }, 5000);
}
