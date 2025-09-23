import { createSlice } from '@reduxjs/toolkit';
import { defaultUpdateDataState } from '../defaultStates';

const updateDataSlice = createSlice({
  name: 'updateData',
  initialState: defaultUpdateDataState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setHealthData: (state, action) => {
      state.healthData = action.payload;
    },
    setUpdateLoading: (state, action) => {
      state.loading = action.payload;
    },
    setUpdateError: (state, action) => {
      state.error = action.payload;
    },
    resetUpdateDataState: (state) => {
      Object.assign(state, defaultUpdateDataState);
    },
  },
});

export const {
  setUserData,
  setHealthData,
  setUpdateLoading,
  setUpdateError,
  resetUpdateDataState
} = updateDataSlice.actions;
export default updateDataSlice.reducer;
