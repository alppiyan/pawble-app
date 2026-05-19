export const SWIPE_ACTIONS = ['left', 'right', 'super'];

export const actionToStatus = (action) => {
  if (action === 'left') return 'rejected';
  if (action === 'super') return 'super';
  return 'pending';
};

export const ACTIVE_LIKE_STATUSES = ['pending', 'super', 'matched'];
