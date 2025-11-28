import React, { useState } from 'react';

function GuestForm({ guestList, setGuestList, maxGuests }) {
  const handleChange = (index, field, value) => {
    const updatedGuests = [...guestList];
    updatedGuests[index][field] = value;
    setGuestList(updatedGuests);
  };

  const renderGuestInputs = () => {
    const inputs = [];
    for (let i = 0; i < maxGuests; i++) {
      const guest = guestList[i] || { name: '', passport: '' };
      inputs.push(
        <div key={i} style={{ marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          <p><strong>탑승자 {i + 1}</strong></p>
          <input
            type="text"
            placeholder="이름"
            value={guest.name}
            onChange={(e) => handleChange(i, 'name', e.target.value)}
            style={{ marginRight: '10px' }}
          />
          <input
            type="text"
            placeholder="여권번호"
            value={guest.passport}
            onChange={(e) => handleChange(i, 'passport', e.target.value)}
          />
        </div>
      );
    }
    return inputs;
  };

  return (
    <div>
      <h3>탑승자 정보 입력</h3>
      {renderGuestInputs()}
    </div>
  );
}

export default GuestForm;
