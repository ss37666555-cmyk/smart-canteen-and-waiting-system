/**
 * SmartQueue Canteen - Queue Engine & Business Logic Core
 *
 * This module encapsulates all pure algorithmic logic for:
 * - Queue state management and transitions
 * - Dynamic waiting-time estimation using Little's Law principles
 * - Token generation, indexing, and validation
 * - Counter throughput adjustments and bounds checking
 * - Order lifecycle state transitions (Waiting -> Serving -> Completed)
 *
 * Architectural Decision:
 * Decoupling pure algorithmic logic from HTTP transport (Express) ensures:
 * 1. 100% deterministic unit testing without network overhead.
 * 2. Predictable state transitions and isolated edge-case handling.
 * 3. Clear separation of concerns between business rules and routing.
 */

// Baseline default configurations based on college canteen benchmarks
const DEFAULT_CONFIG = {
  activeCounters: 3,
  averageServiceTime: 2, // Average duration (minutes) a staff counter takes to fulfill one token
  currentCrowd: 42,      // Estimated baseline canteen footfall
  completedToday: 86,    // Cumulative fulfilled orders for the day
  nowServing: 'A119',    // Active token being served at the main counter
  tokenPrefix: 'A',
  tokenSeed: 132,        // Auto-increment cursor for fresh tokens
  minCounters: 1,        // Minimum operational counter boundary
  maxCounters: 10,       // Physical limit of counters in the canteen layout
  initialQueue: [
    'A120', 'A121', 'A122', 'A123', 'A124', 'A125',
    'A126', 'A127', 'A128', 'A129', 'A130', 'A131'
  ]
};

// Canteen food items catalog
const DEFAULT_MENU = [
  { id: 1, name: 'Chicken Rice', price: 80, category: 'Meals', icon: '🍗', badge: 'Bestseller' },
  { id: 2, name: 'Veg Rice', price: 60, category: 'Meals', icon: '🥗', badge: 'Popular' },
  { id: 3, name: 'Dosa', price: 40, category: 'Tiffin', icon: '🥞', badge: 'Crispy' },
  { id: 4, name: 'Idli', price: 30, category: 'Tiffin', icon: '⚪', badge: 'Steam Hot' },
  { id: 5, name: 'Tea', price: 15, category: 'Beverages', icon: '☕', badge: 'Special' },
  { id: 6, name: 'Coffee', price: 20, category: 'Beverages', icon: '☕', badge: 'Filter Coffee' }
];

/**
 * Validates whether a token string follows the expected college token standard:
 * Single uppercase character prefix followed by 2 or more digits (e.g., A127, B001).
 *
 * @param {string} token
 * @returns {boolean}
 */
function isValidTokenFormat(token) {
  if (typeof token !== 'string') return false;
  return /^[A-Z][0-9]{2,}$/.test(token.trim());
}

/**
 * Calculates the predicted waiting time for a given queue length.
 *
 * Algorithm / Mathematical Basis:
 * Adapted from Little's Law for multi-server queuing systems (M/M/c approximation):
 *
 *   Predicted Wait = (Queue Length * Average Service Time) / Active Counters
 *
 * Edge Case Protections:
 * 1. activeCounters <= 0: Division by zero risk. Returns safe fallback with error flag.
 * 2. queueLength <= 0: Zero students waiting indicates immediate availability (0 mins).
 * 3. Non-numeric or NaN inputs: Sanitized to zero or default parameters.
 *
 * @param {number} queueLength - Number of students waiting ahead
 * @param {number} activeCounters - Number of operational pickup counters
 * @param {number} averageServiceTime - Average minutes required per customer
 * @returns {{ waitingTime: number, valid: boolean, error?: string }}
 */
function calculateWaitingTime(queueLength, activeCounters = DEFAULT_CONFIG.activeCounters, averageServiceTime = DEFAULT_CONFIG.averageServiceTime) {
  const qLen = Number(queueLength);
  const counters = Number(activeCounters);
  const avgTime = Number(averageServiceTime);

  // Validate non-numeric inputs
  if (Number.isNaN(qLen) || Number.isNaN(counters) || Number.isNaN(avgTime)) {
    return {
      waitingTime: 0,
      valid: false,
      error: 'Invalid input parameters: values must be numeric.'
    };
  }

  // Edge case: Division by zero when all counters are closed
  if (counters <= 0) {
    return {
      waitingTime: 0,
      valid: false,
      error: 'Active counters must be at least 1. Counters are currently offline.'
    };
  }

  // Edge case: Empty or negative queue length
  if (qLen <= 0) {
    return {
      waitingTime: 0,
      valid: true
    };
  }

  // Standard queuing throughput estimation rounded to nearest integer
  const estimated = Math.round((qLen * avgTime) / counters);
  return {
    waitingTime: Math.max(0, estimated),
    valid: true
  };
}

/**
 * Computes individual queue position and preceding count for a specific token.
 *
 * @param {Array<string>} queue - Current list of waiting tokens
 * @param {string} token - Token identifier to locate
 * @returns {{ inQueue: boolean, position: number, peopleAhead: number }}
 */
function calculatePosition(queue, token) {
  if (!Array.isArray(queue) || !token) {
    return { inQueue: false, position: 0, peopleAhead: 0 };
  }

  const index = queue.indexOf(token);
  if (index === -1) {
    return { inQueue: false, position: 0, peopleAhead: 0 };
  }

  return {
    inQueue: true,
    position: index + 1,       // 1-indexed queue position for student visibility
    peopleAhead: index          // Total people standing ahead in line
  };
}

/**
 * Validates requested counter counts against physical boundaries (1 to 10).
 *
 * @param {*} val - Input counter value
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
function validateCounterValue(val) {
  const num = parseInt(val, 10);
  if (Number.isNaN(num)) {
    return { valid: false, error: 'Counter value must be a valid integer.' };
  }
  if (num < DEFAULT_CONFIG.minCounters || num > DEFAULT_CONFIG.maxCounters) {
    return {
      valid: false,
      error: `Counter value out of range. Must be between ${DEFAULT_CONFIG.minCounters} and ${DEFAULT_CONFIG.maxCounters}.`
    };
  }
  return { valid: true, value: num };
}

/**
 * QueueManager class
 * Manages mutable in-memory state with strict validation and event logs.
 */
class QueueManager {
  constructor() {
    this.reset();
  }

  /**
   * Resets all in-memory state to the verified demo baseline.
   */
  reset() {
    this.activeCounters = DEFAULT_CONFIG.activeCounters;
    this.averageServiceTime = DEFAULT_CONFIG.averageServiceTime;
    this.currentCrowd = DEFAULT_CONFIG.currentCrowd;
    this.completedToday = DEFAULT_CONFIG.completedToday;
    this.nowServing = DEFAULT_CONFIG.nowServing;
    this.tokenCounter = DEFAULT_CONFIG.tokenSeed;
    this.userToken = null;
    this.demoTokenClaimed = false;
    this.queue = [...DEFAULT_CONFIG.initialQueue];
    this.menu = [...DEFAULT_MENU];
  }

  /**
   * Returns current dashboard overview snapshot.
   */
  getDashboardSnapshot() {
    const waitCalc = calculateWaitingTime(this.queue.length, this.activeCounters, this.averageServiceTime);
    
    // Dynamic crowd categorization based on capacity thresholds
    let crowdStatus = 'Moderate Crowd';
    if (this.currentCrowd > 50) crowdStatus = 'Peak Rush';
    else if (this.currentCrowd < 20) crowdStatus = 'Low Rush';

    return {
      currentCrowd: this.currentCrowd,
      crowdStatus,
      nowServing: this.nowServing,
      activeCounters: this.activeCounters,
      estimatedWait: waitCalc.waitingTime,
      queueLength: this.queue.length,
      completedToday: this.completedToday
    };
  }

  /**
   * Assigns or issues a token for a student joining the queue.
   *
   * Business Logic:
   * 1. If user already holds an active token still in queue, returns their current standing.
   * 2. If first-time demo student joins, assigns pre-seeded A127 to fulfill demo requirements.
   * 3. Subsequent students receive auto-generated sequential tokens (A132, A133...).
   *
   * @param {string} [preferredToken] - Optional preferred token (e.g. for testing)
   * @returns {{ success: boolean, token: string, position: number, peopleAhead: number, estimatedWait: number, status: string }}
   */
  join(preferredToken = null) {
    let assignedToken;

    // Check if user already holds an existing active token
    if (this.userToken && this.queue.includes(this.userToken)) {
      assignedToken = this.userToken;
    } else if (preferredToken && isValidTokenFormat(preferredToken)) {
      assignedToken = preferredToken;
      if (!this.queue.includes(assignedToken)) {
        this.queue.push(assignedToken);
        this.currentCrowd += 1;
      }
      this.userToken = assignedToken;
    } else if (!this.demoTokenClaimed && this.queue.includes('A127')) {
      // First demo user claims A127 at position 8
      assignedToken = 'A127';
      this.userToken = assignedToken;
      this.demoTokenClaimed = true;
    } else {
      // Subsequent joins generate fresh tokens (A132, A133...)
      assignedToken = `${DEFAULT_CONFIG.tokenPrefix}${this.tokenCounter++}`;
      this.queue.push(assignedToken);
      this.currentCrowd += 1;
      this.userToken = assignedToken;
    }

    const posData = calculatePosition(this.queue, assignedToken);
    const waitCalc = calculateWaitingTime(this.queue.length, this.activeCounters, this.averageServiceTime);

    return {
      success: true,
      token: assignedToken,
      position: posData.position,
      peopleAhead: posData.peopleAhead,
      estimatedWait: Math.max(1, waitCalc.waitingTime),
      status: this.nowServing === assignedToken ? 'NOW SERVING' : 'WAITING'
    };
  }

  /**
   * Advances the queue by calling the next waiting student to the counter.
   *
   * State Transitions:
   * - Front of queue is shifted.
   * - Token becomes `nowServing`.
   * - Canteen crowd decrements by 1 (transitioned from waiting area to counter).
   * - Wait times recalculate dynamically.
   *
   * Failure Point Handled:
   * - Calling when queue is empty: prevents shifting undefined and returns explicit error.
   *
   * @returns {{ success: boolean, error?: string, code?: string, nowServing?: string, queueLength?: number, completedToday?: number, currentCrowd?: number, estimatedWait?: number, queue?: Array<string> }}
   */
  callNext() {
    if (this.queue.length === 0) {
      return {
        success: false,
        error: 'Queue is empty. No students are currently waiting to be called.',
        code: 'QUEUE_EMPTY'
      };
    }

    const nextToken = this.queue.shift();
    this.nowServing = nextToken;
    this.completedToday += 1;
    if (this.currentCrowd > 1) {
      this.currentCrowd -= 1;
    }

    const waitCalc = calculateWaitingTime(this.queue.length, this.activeCounters, this.averageServiceTime);

    return {
      success: true,
      message: `Now serving ${this.nowServing}`,
      nowServing: this.nowServing,
      queueLength: this.queue.length,
      completedToday: this.completedToday,
      currentCrowd: this.currentCrowd,
      estimatedWait: waitCalc.waitingTime,
      queue: [...this.queue]
    };
  }

  /**
   * Completes the current token being served and shifts to next order.
   *
   * @returns {{ success: boolean, error?: string, code?: string, nowServing?: string, queueLength?: number, completedToday?: number, currentCrowd?: number, estimatedWait?: number, queue?: Array<string> }}
   */
  completeToken() {
    // If no token is being served and queue is empty
    if (this.nowServing === 'None' && this.queue.length === 0) {
      return {
        success: false,
        error: 'No active token is currently being served, and queue is empty.',
        code: 'NO_ACTIVE_TOKEN'
      };
    }

    const completedToken = this.nowServing;
    this.completedToday += 1;

    if (this.queue.length > 0) {
      this.nowServing = this.queue.shift();
      if (this.currentCrowd > 1) this.currentCrowd -= 1;
    } else {
      this.nowServing = 'None';
    }

    const waitCalc = calculateWaitingTime(this.queue.length, this.activeCounters, this.averageServiceTime);

    return {
      success: true,
      message: `Completed token ${completedToken}. Now serving ${this.nowServing}`,
      nowServing: this.nowServing,
      queueLength: this.queue.length,
      completedToday: this.completedToday,
      currentCrowd: this.currentCrowd,
      estimatedWait: waitCalc.waitingTime,
      queue: [...this.queue]
    };
  }

  /**
   * Updates operational counter capacity with validation.
   *
   * @param {*} count
   * @returns {{ success: boolean, error?: string, code?: string, activeCounters?: number, estimatedWait?: number }}
   */
  setCounters(count) {
    const validation = validateCounterValue(count);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: 'INVALID_COUNTER_VALUE'
      };
    }

    this.activeCounters = validation.value;
    const waitCalc = calculateWaitingTime(this.queue.length, this.activeCounters, this.averageServiceTime);

    return {
      success: true,
      activeCounters: this.activeCounters,
      estimatedWait: waitCalc.waitingTime,
      message: `Active counters updated to ${this.activeCounters}`
    };
  }
}

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_MENU,
  isValidTokenFormat,
  calculateWaitingTime,
  calculatePosition,
  validateCounterValue,
  QueueManager
};
