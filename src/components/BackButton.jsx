import { IconButton, Tooltip } from '@chakra-ui/react';
import { MdArrowBack } from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // No mostrar en el home
  if (location.pathname === '/') {
    return null;
  }

  return (
    <Tooltip label="Volver al inicio" placement="right">
      <IconButton
        icon={<MdArrowBack />}
        position="fixed"
        bottom={6}
        left={6}
        colorScheme="blue"
        size="lg"
        borderRadius="full"
        boxShadow="lg"
        onClick={() => navigate('/')}
        aria-label="Volver al inicio"
        zIndex={100}
      />
    </Tooltip>
  );
};

export default BackButton;