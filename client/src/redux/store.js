import { configureStore } from '@reduxjs/toolkit';
import appSlice from './slices/appSlice';
import authSlice from './slices/authSlice';
import consultSlice from './slices/consultSlice';
import updateDataSlice from './slices/updateDataSlice';
import prescriptionSlice from './slices/prescriptionSlice';
import adminSlice from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    appEvents: appSlice,
    auth: authSlice,
    consult: consultSlice,
    updateData: updateDataSlice,
    prescription: prescriptionSlice,
    admin: adminSlice,
  },
});

export default store;
