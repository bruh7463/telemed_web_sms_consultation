import { createSlice } from '@reduxjs/toolkit';

const prescriptionSlice = createSlice({
  name: 'prescription',
  initialState: {
    prescriptions: [],
    currentPrescription: null,
    loading: false,
    error: null,
  },
  reducers: {
    setPrescriptions: (state, action) => {
      state.prescriptions = action.payload;
    },
    setCurrentPrescription: (state, action) => {
      state.currentPrescription = action.payload;
    },
    addPrescription: (state, action) => {
      state.prescriptions.unshift(action.payload);
    },
    updatePrescription: (state, action) => {
      const index = state.prescriptions.findIndex(p => (p._id || p.id) === (action.payload._id || action.payload.id));
      if (index !== -1) {
        state.prescriptions[index] = action.payload;
      }
    },
    removePrescription: (state, action) => {
      state.prescriptions = state.prescriptions.filter(p => (p._id || p.id) !== action.payload);
    },
    setPrescriptionLoading: (state, action) => {
      state.loading = action.payload;
    },
    setPrescriptionError: (state, action) => {
      state.error = action.payload;
    },
    clearPrescriptionError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setPrescriptions,
  setCurrentPrescription,
  addPrescription,
  updatePrescription,
  removePrescription,
  setPrescriptionLoading,
  setPrescriptionError,
  clearPrescriptionError,
} = prescriptionSlice.actions;

export default prescriptionSlice.reducer;
