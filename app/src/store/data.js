import Vue from 'vue'

import api from '@/api'
import { isEmptyValue } from '@/helpers/commons'


export default {
  state: () => ({
    domains: undefined, // Array
    main_domain: undefined,
    users: undefined, // basic user data: Object {username: {data}}
    users_details: {}, // precise user data: Object {username: {data}}
    groups: undefined,
    permissions: undefined
  }),

  mutations: {
    'SET_DOMAINS' (state, [domains]) {
      state.domains = domains
    },

    'ADD_DOMAINS' (state, [{ domain }]) {
      state.domains.push(domain)
    },

    'DEL_DOMAINS' (state, [domain]) {
      state.domains.splice(state.domains.indexOf(domain), 1)
    },

    'SET_MAIN_DOMAIN' (state, [response]) {
      state.main_domain = response.current_main_domain
    },

    'UPDATE_MAIN_DOMAIN' (state, [domain]) {
      state.main_domain = domain
    },

    'SET_USERS' (state, [users]) {
      state.users = users || null
    },

    'ADD_USERS' (state, [user]) {
      if (!state.users) state.users = {}
      Vue.set(state.users, user.username, user)
    },

    'SET_USERS_DETAILS' (state, [username, userData]) {
      Vue.set(state.users_details, username, userData)
      if (!state.users) return
      const user = state.users[username]
      for (const key of ['firstname', 'lastname', 'mail']) {
        if (user[key] !== userData[key]) {
          Vue.set(user, key, userData[key])
        }
      }
      Vue.set(user, 'fullname', `${userData.firstname} ${userData.lastname}`)
    },

    'UPDATE_USERS_DETAILS' (state, payload) {
      // FIXME use a common function to execute the same code ?
      this.commit('SET_USERS_DETAILS', payload)
    },

    'DEL_USERS_DETAILS' (state, [username]) {
      Vue.delete(state.users_details, username)
      if (state.users) {
        Vue.delete(state.users, username)
        if (Object.keys(state.users).length === 0) {
          state.users = null
        }
      }
    },

    'SET_GROUPS' (state, [groups]) {
      state.groups = groups
    },

    'ADD_GROUPS' (state, [{ name }]) {
      if (state.groups !== undefined) {
        Vue.set(state.groups, name, { members: [], permissions: [] })
      }
    },

    'UPDATE_GROUPS' (state, [data, { groupName }]) {
      Vue.set(state.groups, groupName, data)
    },

    'DEL_GROUPS' (state, [groupname]) {
      Vue.delete(state.groups, groupname)
    },

    'SET_PERMISSIONS' (state, [permissions]) {
      state.permissions = permissions
    },

    'UPDATE_PERMISSIONS' (state, [_, { groupName, action, permId }]) {
      // FIXME hacky way to update the store
      const permissions = state.groups[groupName].permissions
      if (action === 'add') {
        permissions.push(permId)
      } else if (action === 'remove') {
        const index = permissions.indexOf(permId)
        if (index > -1) permissions.splice(index, 1)
      }
    }
  },

  actions: {
    'GET' (
      { state, commit, rootState },
      { uri, param, storeKey = uri, humanKey, noCache, options, ...extraParams }
    ) {
      const currentState = param ? state[storeKey][param] : state[storeKey]
      // if data has already been queried, simply return
      const ignoreCache = !rootState.cache || noCache || false
      if (currentState !== undefined && !ignoreCache) return currentState
      return api.fetch('GET', param ? `${uri}/${param}` : uri, null, humanKey, options).then(responseData => {
        const data = responseData[storeKey] ? responseData[storeKey] : responseData
        commit(
          'SET_' + storeKey.toUpperCase(),
          [param, data, extraParams].filter(item => !isEmptyValue(item))
        )
        return param ? state[storeKey][param] : state[storeKey]
      })
    },

    'POST' ({ state, commit }, { uri, storeKey = uri, data, humanKey, options, ...extraParams }) {
      return api.fetch('POST', uri, data, humanKey, options).then(responseData => {
        // FIXME api/domains returns null
        if (responseData === null) responseData = data
        responseData = responseData[storeKey] ? responseData[storeKey] : responseData
        commit('ADD_' + storeKey.toUpperCase(), [responseData, extraParams].filter(item => !isEmptyValue(item)))
        return state[storeKey]
      })
    },

    'PUT' ({ state, commit }, { uri, param, storeKey = uri, data, humanKey, options, ...extraParams }) {
      return api.fetch('PUT', param ? `${uri}/${param}` : uri, data, humanKey, options).then(responseData => {
        const data = responseData[storeKey] ? responseData[storeKey] : responseData
        commit('UPDATE_' + storeKey.toUpperCase(), [param, data, extraParams].filter(item => !isEmptyValue(item)))
        return param ? state[storeKey][param] : state[storeKey]
      })
    },

    'DELETE' ({ commit }, { uri, param, storeKey = uri, data, humanKey, options, ...extraParams }) {
      return api.fetch('DELETE', param ? `${uri}/${param}` : uri, data, humanKey, options).then(() => {
        commit('DEL_' + storeKey.toUpperCase(), [param, extraParams].filter(item => !isEmptyValue(item)))
      })
    },

    'RESET_CACHE_DATA' ({ state }, keys = Object.keys(state)) {
      for (const key of keys) {
        if (key === 'users_details') {
          state[key] = {}
        } else {
          state[key] = undefined
        }
      }
    }
  },

  getters: {
    users: state => {
      if (state.users) return Object.values(state.users)
      return state.users
    },

    userNames: state => {
      if (state.users) return Object.keys(state.users)
      return []
    },

    user: state => name => state.users_details[name], // not cached

    domains: state => state.domains,

    mainDomain: state => state.main_domain,

    domainsAsChoices: state => {
      const mainDomain = state.main_domain
      return state.domains.map(domain => {
        return { value: domain, text: domain === mainDomain ? domain + ' ★' : domain }
      })
    }
  }
}
