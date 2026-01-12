// Модуль для взаимодействия с API языковой школы.
// Все функции возвращают Promise.

// Вспомогательная функция для формирования URL с API-ключом.
// @param {string} path — путь к эндпоинту (например, '/api/courses')
// @returns {string} Полный URL с api_key

function buildUrl(path) {
  const url = new URL(path, API_BASE_URL);
  url.searchParams.append('api_key', API_KEY);
  return url.toString();
}

/**
 * Универсальная функция для отправки запросов.
 * @param {string} url — полный URL запроса
 * @param {Object} options — параметры fetch
 * @returns {Promise} Обработанный JSON или ошибка
 */
async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) errorMessage = errorJson.error;
      } catch (e) {
        // Используем текст ошибки как есть
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// === Экспортируемые функции ===

/**
 * Получить список курсов.
 * @returns {Promise<Array>} Массив курсов
 */
async function fetchCourses() {
  const url = buildUrl('/api/courses');
  return await apiRequest(url);
}

/**
 * Получить список репетиторов.
 * @returns {Promise<Array>} Массив репетиторов
 */
async function fetchTutors() {
  const url = buildUrl('/api/tutors');
  return await apiRequest(url);
}

/**
 * Получить список заявок текущего пользователя.
 * @returns {Promise<Array>} Массив заявок
 */
async function fetchOrders() {
  const url = buildUrl('/api/orders');
  return await apiRequest(url);
}

/**
 * Создать новую заявку.
 * @param {Object} orderData — данные заявки
 * @returns {Promise<Object>} Созданная заявка
 */
async function createOrder(orderData) {
  const url = buildUrl('/api/orders');
  return await apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

/**
 * Обновить существующую заявку.
 * @param {number} orderId — ID заявки
 * @param {Object} orderData — обновлённые данные
 * @returns {Promise<Object>} Обновлённая заявка
 */
async function updateOrder(orderId, orderData) {
  const url = buildUrl(`/api/orders/${orderId}`);
  return await apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(orderData),
  });
}

/**
 * Удалить заявку.
 * @param {number} orderId — ID заявки
 * @returns {Promise<Object>} Ответ сервера (обычно { id: ... })
 */
async function deleteOrder(orderId) {
  const url = buildUrl(`/api/orders/${orderId}`);
  return await apiRequest(url, {
    method: 'DELETE',
  });
}

/**
 * Получить детали заявки по ID.
 * @param {number} orderId — ID заявки
 * @returns {Promise<Object>} Данные заявки
 */
async function fetchOrderById(orderId) {
  const url = buildUrl(`/api/orders/${orderId}`);
  return await apiRequest(url);
}


/**
 * Получить курс по ID.
 */
async function fetchCourseById(id) {
  const courses = await fetchCourses();
  return courses.find(c => c.id == id);
}

/**
 * Получить репетитора по ID.
 */
async function fetchTutorById(id) {
  const tutors = await fetchTutors();
  return tutors.find(t => t.id == id);
}