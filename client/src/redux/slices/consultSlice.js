import { createSlice } from '@reduxjs/toolkit';
import { defaultConsultState } from '../defaultStates';

const consultSlice = createSlice({
  name: 'consult',
  initialState: defaultConsultState,
  reducers: {
    setConsultations: (state, action) => {
      state.consultations = action.payload;
    },
    updateConsultation: (state, action) => {
      const { id, ...updates } = action.payload;
      const index = state.consultations.findIndex(c => (c._id || c.id) === id);
      if (index !== -1) {
        state.consultations[index] = { ...state.consultations[index], ...updates };
      }
    },
    setCurrentConsultation: (state, action) => {
      state.currentConsultation = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setConsultLoading: (state, action) => {
      state.loading = action.payload;
    },
    setConsultError: (state, action) => {
      state.error = action.payload;
    },
    resetConsultState: (state) => {
      Object.assign(state, defaultConsultState);
    },
  },
});

export const {
  setConsultations,
  updateConsultation,
  setCurrentConsultation,
  setMessages,
  addMessage,
  setConsultLoading,
  setConsultError,
  resetConsultState
} = consultSlice.actions;
export default consultSlice.reducer;
