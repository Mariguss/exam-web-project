/**
 * Скрипт личного кабинета.
 */

// Глобальные переменные
let allOrders = [];
const ORDERS_PER_PAGE = 5;
let currentOrderIdForEdit = null;
let currentOrderIdForDelete = null;

// === НОВОЕ: Храним данные курса/репетитора, чтобы знать их цену ===
let currentEditEntity = null; // Здесь будет объект курса или репетитора
let currentEditOrder = null; // Здесь сама заявка

document.addEventListener('DOMContentLoaded', async () => {
  await loadOrders();

  // Кнопки
  document.getElementById('saveEditBtn').addEventListener('click', saveEditedOrder);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteOrder);

  // Поля ввода для пересчёта цены
  const editInputs = [
    'editStudentsNumber', 
    'editSupplementary', 
    'editPersonalized', 
    'editExcursions', 
    'editAssessment', 
    'editInteractive',
    'editDuration' // ДОБАВЛЕНО
  ];
  
  editInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', recalculateEditPrice);
      element.addEventListener('input', recalculateEditPrice);
    }
  });
});

async function loadOrders() {
  try {
    const orders = await fetchOrders();
    allOrders = orders;
    renderOrders(orders);
  } catch (error) {
    showNotification(`Ошибка загрузки: ${error.message}`, 'danger');
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  const pagination = document.getElementById('ordersPagination');
  const noOrdersMsg = document.getElementById('noOrdersMessage');

  tbody.innerHTML = '';
  pagination.innerHTML = '';

  if (orders.length === 0) {
    noOrdersMsg.classList.remove('d-none');
    return;
  }

  noOrdersMsg.classList.add('d-none');
  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  
  // Отображаем первую страницу
  displayOrdersPage(orders, 1, totalPages);
  renderPagination(pagination, totalPages, 1, (page) => {
    displayOrdersPage(orders, page, totalPages);
  });
}

function displayOrdersPage(orders, page, totalPages) {
  const start = (page - 1) * ORDERS_PER_PAGE;
  const end = start + ORDERS_PER_PAGE;
  const pageOrders = orders.slice(start, end);
  const tbody = document.getElementById('ordersTableBody');

  tbody.innerHTML = pageOrders.map((order, index) => {
    // Определяем название
    const title = order.course_id ? 'Курс' : 'Репетитор';
    
    // Красивая дата
    const date = new Date(order.date_start).toLocaleDateString('ru-RU');

    return `
  <tr>
    <td>${start + index + 1}</td>
    <td>${title}</td>
    <td>${date}</td>
    <td>${order.price} ₽</td>
    <td>
      <button class="btn btn-sm btn-info me-1" onclick="viewOrder(${order.id})">More Details</button>
      <button class="btn btn-sm btn-warning me-1" onclick="editOrder(${order.id})">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteOrderPrompt(${order.id})">Delete</button>
    </td>
  </tr>
`;
  }).join('');
}

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

  // Убираем старые слушатели и добавляем новые
  const links = container.querySelectorAll('.page-link');
  links.forEach(link => {
    link.removeEventListener('click', pageClickHandler); // Удаляем старый слушатель
    link.addEventListener('click', pageClickHandler);   // Добавляем новый
  });

  // Функция-обработчик клика на страницу
  function pageClickHandler(e) {
    e.preventDefault();
    const page = parseInt(e.target.dataset.page);
    onPageChange(page);

    // Очищаем все .page-item от active
    links.forEach(l => l.parentElement.classList.remove('active'));
    // Добавляем active только текущей
    e.target.parentElement.classList.add('active');
  }
}

// === ПРОСМОТР ===
async function viewOrder(orderId) {
  try {
    const order = await fetchOrderById(orderId);

    // Получаем данные курса или репетитора
    let entity = null;
    if (order.course_id) {
      entity = await fetchCourseById(order.course_id);
    } else if (order.tutor_id) {
      entity = await fetchTutorById(order.tutor_id);
    }

    // Формируем контент
    let title = '';
    let description = '';
    let teacherOrName = '';
    let durationText = '';

    if (entity) {
      if (order.course_id) {
        title = entity.name;
        description = entity.description;
        teacherOrName = `Преподаватель: ${entity.teacher}`;
        durationText = `${entity.total_length} недель (${entity.week_length} ч/нед)`;
      } else {
        title = `Репетитор: ${entity.name}`;
        description = `Уровень: ${entity.language_level}, Опыт: ${entity.work_experience} лет`;
        teacherOrName = `Языки: ${entity.languages_offered.join(', ')}`;
        durationText = `${order.duration} час(а)`;
      }
    }

    // Форматируем дату и время
    const date = new Date(order.date_start).toLocaleDateString('ru-RU');
    const time = order.time_start || '—';

    // Собираем HTML
    const content = `
      <div class="mb-3">
        <strong>Название:</strong> ${title}
      </div>
      <div class="mb-3">
        <strong>Описание:</strong> ${description}
      </div>
      <div class="mb-3">
        <strong>${teacherOrName}</strong>
      </div>
      <div class="mb-3">
        <strong>Дата начала:</strong> ${date}
      </div>
      <div class="mb-3">
        <strong>Время:</strong> ${time}
      </div>
      <div class="mb-3">
        <strong>Продолжительность:</strong> ${durationText}
      </div>
      <div class="mb-3">
        <strong>Студентов:</strong> ${order.persons}
      </div>
      <div class="mb-3">
        <strong>Стоимость:</strong> ${order.price} ₽
      </div>
      <div class="mb-3">
        <strong>Опции:</strong>
        <ul>
          ${order.supplementary ? '<li>Доп. материалы</li>' : ''}
          ${order.personalized ? '<li>Индивидуальные занятия</li>' : ''}
          ${order.excursions ? '<li>Культурные экскурсии</li>' : ''}
          ${order.assessment ? '<li>Оценка уровня</li>' : ''}
          ${order.interactive ? '<li>Интерактивная платформа</li>' : ''}
        </ul>
      </div>
      <div class="mb-3">
        <strong>Скидки/надбавки:</strong>
        <ul>
          ${order.early_registration ? '<li>Ранняя регистрация (-10%)</li>' : ''}
          ${order.group_enrollment ? '<li>Групповая запись (-15%)</li>' : ''}
          ${order.intensive_course ? '<li>Интенсивный курс (+20%)</li>' : ''}
        </ul>
      </div>
    `;

    // Вставляем в модалку
    document.getElementById('detailModalContent').innerHTML = content;

    // Открываем модалку
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();

  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, 'danger');
    console.error('Ошибка при просмотре заявки:', error);
  }
}

// === ИСПРАВЛЕНИЕ: Логика РЕДАКТИРОВАНИЯ ===

/**
 * Открывает модальное окно для редактирования заявки.
 */
async function editOrder(orderId) {
  try {
    const order = await fetchOrderById(orderId);
    currentOrderIdForEdit = orderId;
    currentEditOrder = order;

    if (order.course_id) {
      currentEditEntity = await fetchCourseById(order.course_id);
      document.getElementById('editOrderTitle').value = `Курс: ${currentEditEntity.name}`;
      
      // Для курса — продолжительность фиксирована
      const totalHours = currentEditEntity.total_length * currentEditEntity.week_length;
      document.getElementById('editDuration').value = totalHours;
      document.getElementById('editDuration').readOnly = true;
      document.getElementById('editDuration').style.display = 'none';
      
    } else if (order.tutor_id) {
      currentEditEntity = await fetchTutorById(order.tutor_id);
      document.getElementById('editOrderTitle').value = `Репетитор: ${currentEditEntity.name}`;
      
      // Для репетитора — можно редактировать продолжительность
      document.getElementById('editDuration').value = order.duration || 1;
      document.getElementById('editDuration').readOnly = false;
      document.getElementById('editDuration').style.display = 'block';
    }

    // Заполняем остальные поля
    document.getElementById('editStudentsNumber').value = order.persons;
    document.getElementById('editSupplementary').checked = order.supplementary;
    document.getElementById('editPersonalized').checked = order.personalized;
    document.getElementById('editExcursions').checked = order.excursions;
    document.getElementById('editAssessment').checked = order.assessment;
    document.getElementById('editInteractive').checked = order.interactive;

    recalculateEditPrice();
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();

  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, 'danger');
  }
}

/**
 * ИСПРАВЛЕНИЕ 3: Правильный пересчет цены (прямой метод).
 * Мы берем цену часа из currentEditEntity и умножаем на всё заново.
 */
/**
 * Пересчитывает цену при редактировании.
 */
function recalculateEditPrice() {
  if (!currentEditEntity || !currentEditOrder) return;

  const students = parseInt(document.getElementById('editStudentsNumber').value) || 1;
  let totalPrice = 0;

  if (currentEditOrder.course_id) {
    // Логика для курса
    const totalHours = currentEditEntity.total_length * currentEditEntity.week_length;
    let basePrice = currentEditEntity.course_fee_per_hour * totalHours;

    const date = new Date(currentEditOrder.date_start);
    const day = date.getDay();
    if (day === 0 || day === 6) basePrice *= 1.5; // выходные

    if (currentEditOrder.time_start) {
      const hour = parseInt(currentEditOrder.time_start.split(':')[0]);
      if (hour >= 9 && hour < 12) basePrice += 400;
      if (hour >= 18 && hour < 20) basePrice += 1000;
    }

    totalPrice = basePrice * students;

    // Опции для курса
    if (document.getElementById('editSupplementary').checked) totalPrice += 2000 * students;
    if (document.getElementById('editPersonalized').checked) totalPrice += 1500 * currentEditEntity.total_length;
    if (document.getElementById('editExcursions').checked) totalPrice *= 1.25;
    if (document.getElementById('editAssessment').checked) totalPrice += 300;
    if (document.getElementById('editInteractive').checked) totalPrice *= 1.5;

    // Скидки/надбавки
    if (students >= 5) totalPrice *= 0.85;
    if (currentEditOrder.early_registration) totalPrice *= 0.9;
    if (currentEditEntity.week_length >= 5) totalPrice *= 1.2;

  } else {
    // Логика для репетитора
    const duration = parseInt(document.getElementById('editDuration').value) || 1;
    let basePrice = currentEditEntity.price_per_hour * duration;
    totalPrice = basePrice * students;

    // Опции для репетитора
    if (document.getElementById('editSupplementary').checked) totalPrice += 2000 * students;
    if (document.getElementById('editPersonalized').checked) totalPrice += 1500;
    if (document.getElementById('editExcursions').checked) totalPrice *= 1.25;
    if (document.getElementById('editAssessment').checked) totalPrice += 300;
    if (document.getElementById('editInteractive').checked) totalPrice *= 1.5;

    // Скидка за группу
    if (students >= 5) totalPrice *= 0.85;
  }

  document.getElementById('editTotalPrice').textContent = Math.round(totalPrice);
}

/**
 * Сохраняет отредактированную заявку.
 */
async function saveEditedOrder() {
  const students = parseInt(document.getElementById('editStudentsNumber').value) || 1;
  const isGroup = students >= 5;
  const isIntensive = currentEditOrder.course_id
    ? currentEditEntity.week_length >= 5
    : false;
  const isEarly = currentEditOrder.early_registration;

  const orderData = {
    persons: students,
    early_registration: isEarly,
    group_enrollment: isGroup,
    intensive_course: isIntensive,
    supplementary: document.getElementById('editSupplementary').checked,
    personalized: document.getElementById('editPersonalized').checked,
    excursions: document.getElementById('editExcursions').checked,
    assessment: document.getElementById('editAssessment').checked,
    interactive: document.getElementById('editInteractive').checked,
    price: parseInt(document.getElementById('editTotalPrice').textContent)
  };

  // Добавляем duration ТОЛЬКО для репетитора
  if (currentEditOrder.tutor_id) {
    orderData.duration = parseInt(document.getElementById('editDuration').value) || 1;
  }

  try {
    await updateOrder(currentOrderIdForEdit, orderData);
    const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
    modal.hide();
    showNotification('Заявка обновлена!', 'success');
    setTimeout(loadOrders, 200);
  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, 'danger');
  }
}

// === УДАЛЕНИЕ ===
function deleteOrderPrompt(orderId) {
  currentOrderIdForDelete = orderId;
  const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  modal.show();
}

async function confirmDeleteOrder() {
  try {
    await deleteOrder(currentOrderIdForDelete);
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
    modal.hide();
    showNotification('Заявка удалена', 'success');
    loadOrders();
  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, 'danger');
  }
}

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

  setTimeout(() => {
    if (alert.parentNode === container) {
      container.removeChild(alert);
    }
  }, 5000);
}