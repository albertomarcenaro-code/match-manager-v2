import React from 'react';
import { useNavigate } from 'react-router-dom';

const MatchApp = () => {
    const navigate = useNavigate();

    return (
        <div>
            <button onClick={() => navigate('/dashboard')}>Home</button>
            {/* Other components and JSX */}
        </div>
    );
};

export default MatchApp;