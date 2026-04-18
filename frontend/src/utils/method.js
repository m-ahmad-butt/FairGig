export const extractRollNo = (email) => {
    let res = ""
    res += email.slice(1, 3)
    res += email[0].toUpperCase() + '-';
    res += email.slice(3, 7);
    return res
}

export const validateEmail = (email) => {
    const regex = /^[likfpm]\d{6}@(lhr\.|isb\.|khi\.|cfd\.|pwr\.|mtn\.)?nu\.edu\.pk$/i;
    return regex.test(email);
};

export const validatePassword = (pass) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    return regex.test(pass);
};

export const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, "");
    return /^03/.test(phone) && digits.length === 11;
};

export const validateVehicleNumber = (vNum) => {
    const regex = /^[A-Z]{3,}-\d{4}$/i;
    return regex.test(vNum);
};

export const convertTo12Hour = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
};

export const getCampuses = () => {
    return [
        { id: "LHR", name: "Lahore" },
        { id: "ISB", name: "Islamabad" },
        { id: "KHI", name: "Karachi" },
        { id: "PWR", name: "Peshawar" },
        { id: "MTN", name: "Multan" },
        { id: "CFD", name: "Faisalabad" }
    ];
}
