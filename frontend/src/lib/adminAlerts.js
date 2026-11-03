import Swal from 'sweetalert2';

export function notifySuccess(title) {
  return Swal.fire({
    icon: 'success',
    title,
    confirmButtonText: 'OK',
    confirmButtonColor: '#842944',
  });
}
