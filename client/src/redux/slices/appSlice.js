import { createSlice } from '@reduxjs/toolkit';
import { defaultAppState } from '../defaultStates';

const appSlice = createSlice({
  name: 'appEvents',
  initialState: defaultAppState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setAsideEvent: (state, action) => {
      state.asideEvent = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetAppState: (state) => {
      Object.assign(state, defaultAppState);
    },
  },
});

export const { setUserData, setAsideEvent, setLoading, setError, resetAppState } = appSlice.actions;
export default appSlice.reducer;
