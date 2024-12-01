import axios from 'axios';
import { API_URL,API_VER } from '../constants.json';
import base64 from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
class APIManager {

    static instance;
    static sessionId;
    constructor() {
        if (!APIManager.instance) {
            this.tempAxios = axios.create({
                baseURL: API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'sessionId': APIManager.sessionId
                },
            });
            const storedSessionId = AsyncStorage.getItem('sessionId').then((value) => {
                if (value != null) {
                    console.log("Session ID from local storage: ", value)
                    APIManager.sessionId = value;
                    this.instance.defaults.headers['sessionId'] = APIManager.sessionId;
                } else {
                    console.log("Session ID not found in local storage.")
                    this.createSession();
                }
            }).catch((err) => {
                console.error("Error while fetching session ID from local storage:", err);
            });

            this.instance = axios.create({
                baseURL: API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'sessionId': APIManager.sessionId,
                },
            });
            APIManager.instance = this;
        }
        return APIManager.instance;
    }

    setupInterceptors() {
        // Request interceptor
        this.instance.interceptors.request.use((config) => {
            // Add your headers and session ID here
            config.headers['sessionId'] = APIManager.sessionId;
            return config;
        }, (error) => {
            return Promise.reject(error);
        });

        // Response interceptor
        this.instance.interceptors.response.use((response) => {
            return response;
        }, async (error) => {
            if (error.response && error.response.data.code === 1301) {
                // Session is expired
                console.log('Session expired');

                // Refresh the session
                await this.createSession();

                // Retry the original request
                const originalRequest = error.config;
                originalRequest.headers['sessionId'] = APIManager.sessionId;
                return this.instance(originalRequest);
            }

            return Promise.reject(error);
        });
    }

    get axiosInstance() {
        if (!this.instance) {
            this.instance = axios.create({
                baseURL: API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'sessionId': APIManager.sessionId,
                },
                 
            });
        }
        return this.instance;
    }

    async createSession() {
        try {
            const res = await this.tempAxios.put(API_URL + API_VER +'/createSession')
            if (res) {

                if (res.data.code == 1007) {
                    this.sessionId = res.data.result
                    APIManager.sessionId = this.sessionId;
                    console.log("Session ID: ", APIManager.sessionId)
                    this.instance.defaults.headers['sessionId'] = APIManager.sessionId;
                    await AsyncStorage.setItem('sessionId', APIManager.sessionId);
                }
            } else {
                console.error("Session ID not found in the response.");
            }
        } catch (err) {
            console.error("Error while creating session:", err);
        }
    }

    async startTracking(tripId, currentLat, currentLng) {
        console.log(currentLat, currentLng)
        try {
            const res = await this.axiosInstance.post(API_URL + '/startTracking', {
                tripId: tripId,
                currentLat: currentLat,
                currentLng: currentLng
            })
            if (res) {
                return res.data;
            }
        } catch (err) {
            console.log("Error while starting tracking:", err.response)
        }
    }

    async getDevices() {
        try {
            const res = await this.axiosInstance.get(API_URL+API_VER + '/devices')
            return res.data;
        } catch (err) {
            console.log("Error while fetching devices:", err.response)
        }
    }
     
    verifyUserId(userId) {
        console.log("User ID Verification:", userId)
        if (userId === undefined || userId == null || userId == "") {
            return false;
        } else {
            return true;
        }
    }

    verifyUserLogin(code) {
        if (code === 1031) {
            return false;
        } else {
            return true
        }
    }


    setAuth(auth) {
        const authString = `${auth.email}:${auth.token}`;
        console.log("Setting Auth for", auth.email)
        const authBase64 = base64.encode(authString)
        this.instance.defaults.headers['Authorization'] = `Basic ${authBase64}`;
    }
    get(path, params) {
        return this.instance.get(path, params);
    }

    post(path, params) {
        return this.instance.post(path, params);
    }

    put(path, params) {
        return this.instance.put(path, params);
    }

    delete(path, params) {
        return this.instance.delete(path, params);
    }
}

const apiManager = new APIManager();
apiManager.setupInterceptors();
export default apiManager;