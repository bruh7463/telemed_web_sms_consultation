import { createSlice } from '@reduxjs/toolkit';

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    dashboard: null,
    users: {
      patients: [],
      doctors: [],
      admins: [],
    },
    currentUser: null,
    loading: false,
    error: null,
  },
  reducers: {
    setDashboard: (state, action) => {
      state.dashboard = action.payload;
    },
    setUsers: (state, action) => {
      const { role, users } = action.payload;
      state.users[role] = users;
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
    addUser: (state, action) => {
      const { role, user } = action.payload;
      // Ensure user has consistent ID field
      const userWithId = { ...user, id: user.id || user._id };
      state.users[role].unshift(userWithId);
    },
    updateUser: (state, action) => {
      const { role, user } = action.payload;
      // Ensure user has consistent ID field
      const userWithId = { ...user, id: user.id || user._id };
      const index = state.users[role].findIndex(u => (u.id || u._id) === (user.id || user._id));
      if (index !== -1) {
        state.users[role][index] = userWithId;
      }
    },
    removeUser: (state, action) => {
      const { role, userId } = action.payload;
      state.users[role] = state.users[role].filter(u => (u.id || u._id) !== userId);
    },
    setAdminLoading: (state, action) => {
      state.loading = action.payload;
    },
    setAdminError: (state, action) => {
      state.error = action.payload;
    },
    clearAdminError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setDashboard,
  setUsers,
  setCurrentUser,
  addUser,
  updateUser,
  removeUser,
  setAdminLoading,
  setAdminError,
  clearAdminError,
} = adminSlice.actions;

export default adminSlice.reducer;
