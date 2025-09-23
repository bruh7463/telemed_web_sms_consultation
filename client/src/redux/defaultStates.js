// Default states for Redux slices

export const defaultAppState = {
  userData: {
    id: null,
    name: '',
    email: '',
    role: '',
  },
  asideEvent: '',
  loading: false,
  error: null,
};

export const defaultAuthState = {
  isAuthenticated: false,
  user: null,
  role: null,
  token: null,
  loading: false,
  error: null,
};

export const defaultConsultState = {
  consultations: [],
  currentConsultation: null,
  messages: [],
  loading: false,
  error: null,
};

export const defaultUpdateDataState = {
  userData: null,
  healthData: null,
  loading: false,
  error: null,
};
