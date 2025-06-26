import { useState } from "react";
import { CircleX } from "lucide-react";

const PointsModal = () => {
  const [showModal, setShowModal] = useState<boolean>(true);

  return (
    showModal && (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/40"
        onClick={() => setShowModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white rounded-xl px-10 py-12 w-[90%] max-w-md text-center space-y-8"
        >
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <CircleX size={22} />
          </button>

          <div
            className="absolute inset-0 pointer-events-none
                        bg-[url('/stars.png')] bg-contain bg-center filter grayscale"
          />

          <div className="relative z-10">
            <img
              src="/Badge.png"
              alt="X logo"
              width={260}
              height={260}
              className="mx-auto"
            />
            <span className="absolute font-bold top-[41%] -translate-x-1/2 left-1/2 text-white text-5xl z-50">175</span>
          </div>
          <p className="font-medium relative text-lg">Congratulations! You’ve earned 175 points based on your prediction</p>
        </div>
      </div>
    )
  );
};

export default PointsModal;
