import { createSlice } from '@reduxjs/toolkit';
import { defaultAuthState } from '../defaultStates';

const authSlice = createSlice({
  name: 'auth',
  initialState: defaultAuthState,
  reducers: {
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setAuthLoading: (state, action) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action) => {
      state.error = action.payload;
    },
    logout: (state) => {
      Object.assign(state, defaultAuthState);
    },
  },
});

export const { setAuthenticated, setUser, setRole, setToken, setAuthLoading, setAuthError, logout } = authSlice.actions;
export default authSlice.reducer;
