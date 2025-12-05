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
    <Tooltip label="Volver al inicio" placement="right" bg="gray.800" color="white" border="1px" borderColor="gray.700">
      <IconButton
        icon={<MdArrowBack />}
        position="fixed"
        bottom={6}
        left={6}
        bgGradient="linear(to-r, purple.500, purple.600)"
        color="white"
        size="lg"
        borderRadius="full"
        boxShadow="2xl"
        _hover={{
          bgGradient: 'linear(to-r, purple.600, purple.700)',
        }}
        onClick={() => navigate('/')}
        aria-label="Volver al inicio"
        zIndex={100}
      />
    </Tooltip>
  );
};

export default BackButton;