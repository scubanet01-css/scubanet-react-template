// client/src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from "react";

// ✅ 인증 정보를 보관할 Context 생성
const AuthContext = createContext();

// ✅ AuthProvider: 앱 전체를 감싸서 로그인 상태를 전달
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// ✅ useAuth 훅: 어디서든 user, login, logout 접근 가능
export function useAuth() {
    return useContext(AuthContext);
}
