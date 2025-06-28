import Header from "@/components/header/Header";
import Link from "next/link";
import Image from "next/image";

/* Height for edge images when visible (≥ lg) */
const EDGE_HEIGHT = "70vh";

const HowItWorks = () => {
  return (
    <>
      <Header />
      <div className="relative bg-gradient-to-r from-[#EBEFF7] via-white to-[#EBEFF7] flex flex-col font-sans justify-between items-center pt-[80px] min-h-screen">
        {/* decorative edge images – show only ≥ lg */}
        <div
          className="absolute left-0 hidden lg:block pointer-events-none select-none"
          style={{
            height: EDGE_HEIGHT,
            top: `calc(50% - ${EDGE_HEIGHT}/2)`,
            width: "35vw",
            maxWidth: "520px",
          }}
        >
          <Image
            src="/Left.png"
            alt=""
            fill
            priority
            className="object-cover filter grayscale opacity-40"
          />
        </div>
        <div
          className="absolute right-0 hidden lg:block pointer-events-none select-none"
          style={{
            height: EDGE_HEIGHT,
            top: `calc(50% - ${EDGE_HEIGHT}/2)`,
            width: "35vw",
            maxWidth: "520px",
          }}
        >
          <Image
            src="/Right.png"
            alt=""
            fill
            priority
            className="object-cover filter grayscale opacity-40"
          />
        </div>

        <div className="relative translate-y-[10%] xl:translate-y-1/4 bg-white border border-[#DCDCDC] flex flex-col gap-8 m-4 lg:my-0 lg:mx-auto px-8 py-12 rounded-xl lg:w-1/2 xl:w-2/5">
          <h2 className="font-bold text-center text-4xl">HOW IT WORKS</h2>
          <p className="">
            Time Machine allows you to encrypt your prediction. every week we
            will add 2 tokens for the next 2 weeks, meaning everyone can guess
            what will be the price and encrypt prediction to earn points. the
            closer your prediction the more points you will get.
          </p>
          <ul className="text-lg ml-5">
            <li className="list-disc list-outside">
              <span className="font-medium">Step 1:</span> Guess what its
              price will be next week for the given token.
            </li>
            <li className="list-disc list-outside">
              <span className="font-medium">Step 2:</span> Enter you
              prediction and encrypt it.
            </li>
            <li className="list-disc list-outside">
              <span className="font-medium">Step 3:</span> Wait till it got
              decrypted and earn points.
            </li>
          </ul>
          <Link className="bg-black font-medium mx-auto px-6 py-2 rounded-xl text-white text-lg w-fit" href={"/prediction"}>
            I'm ready to predict
          </Link>
        </div>
      </div>
    </>
  );
};

export default HowItWorks;
