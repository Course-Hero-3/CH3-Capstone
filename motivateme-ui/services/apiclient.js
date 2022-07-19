import axios from "axios"

class ApiClient {
    constructor(remoteHostUrl) {
        this.remoteHostUrl = remoteHostUrl
        this.token = null
    }
   
    setToken(token) {
        this.token = token
        window.localStorage.setItem("user_token", token)
    }

    async request({ endpoint, method="GET", data={} }) {
       const url = `${this.remoteHostUrl}/${endpoint}`
       const headers =  {
           "Content-Type": "application/json",
       }
       if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`
       }
    
       try {
        const res = await axios({url, method, data, headers})
            return { data: res.data, error: null }

       } catch(error) {
            const message = error?.response?.data?.error?.message
            return { data:null, error: message || String(err) }
       }
    }

    logout() {
        this.setToken(null)        
        window.localStorage.removeItem("user_token")
    }

    async login(userInfo) {
       return await this.request({ endpoint:`auth/login`, method:`POST`, data:userInfo })
    }
    async register(userInfo) {
        return await this.request({ endpoint:`auth/register`, method:`POST`, data:userInfo })
    }
    async fetchUserFromToken() {
       return await this.request({ endpoint: `auth/me`, method: `GET` })
    }
    async getAllTasks() {
        return await this.request({ endpoint: `todo/alltasks`, method: `GET` })
    }
    async completeTask(completedTask) {
        return await this.request({ endpoint:`todo/completetask`, method:`POST`, data:completedTask })
    }
    async addTask(newTask) {
        return await this.request({ endpoint:`todo/addtask`, method:`POST`, data:newTask })
    }
    async updateTask(updatedTask) {
        return await this.request({ endpoint:`todo/updatetask`, method:`PUT`, data:updatedTask })
    }
    async deleteTask(objectWithTaskId) {
        return await this.request({ endpoint:`todo/deletetask`, method:`DELETE`, data:objectWithTaskId })
    }
    async getSummary() {
        return await this.request({ endpoint: `recap/summary`, method: `GET` })
    }
}

export default new ApiClient("http://localhost:3001")