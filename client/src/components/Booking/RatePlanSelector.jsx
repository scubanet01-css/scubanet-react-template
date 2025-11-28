import React from 'react';

function RatePlanSelector({ ratePlans, selectedPlanId, onSelect }) {
  if (!ratePlans || ratePlans.length === 0) return null;

  return (
    <div style={{ marginBottom: '16px' }}>
      <h3>요금제 선택</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {ratePlans.map((plan) => (
          <li
            key={plan.id}
            onClick={() => onSelect(plan)}
            style={{
              padding: '8px',
              marginBottom: '8px',
              border: plan.id === selectedPlanId ? '2px solid blue' : '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: plan.id === selectedPlanId ? '#e0f0ff' : '#fff'
            }}
          >
            <strong>{plan.name}</strong>
            <div>{plan.description || '설명 없음'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RatePlanSelector;
