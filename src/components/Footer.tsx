import {ArrowLeft, ArrowRight} from 'lucide-react';
import { QUOTES_ARRAY } from '../lib/consts';
import { useState } from 'react';


function setRandomQuote(list: string[]) {

  let r = Math.floor(Math.random() * list.length);
  return {index: r, content: list[r]}

}

const Footer = () => {
  const initQuote = setRandomQuote(QUOTES_ARRAY)

  const [quote, setQuote] = useState(initQuote.content);

  const prevQuote = initQuote.index > 0 ? QUOTES_ARRAY[initQuote.index - 1] : null;
  const nextQuote = initQuote.index < QUOTES_ARRAY.length - 1 ? QUOTES_ARRAY[initQuote.index + 1] : null;

  // Handler for setting the previous quote
  const handlePrevQuote = () => {
    if (prevQuote) {
      setQuote(prevQuote);
    }
  };

  // Handler for setting the next quote
  const handleNextQuote = () => {
    if (nextQuote) {
      setQuote(nextQuote);
    }
  };

  return (
    <footer className="w-full max-w-3xl mx-auto pt-4 pb-10 sm:pb-14 text-center">

    <span className="flex items-center py-12 pt-16 
    border-t border-gray-300">
      <ArrowLeft 
        className={`w-6 h-6 transition-all duration-300 ${
          prevQuote ? 'hover:translate-x-2 hover:cursor-pointer hover:scale-110' : 'opacity-50 cursor-not-allowed scale-75'}`} 
        onClick={handlePrevQuote}
      />
      
      <div className="flex items-center justify-center w-full h-[72px] max-w-[500px] mx-auto text-lg">
      
        <i className="inline-block text-center select-none">
          {quote.split("<br>")[0]}  <br/>
          {quote.split("<br>")[1]}
        </i>
      </div>

      <ArrowRight 
        className={`w-6 h-6 transition-all duration-300 ${
          nextQuote ? 'hover:-translate-x-2 hover:cursor-pointer hover:scale-110' : 'opacity-50 cursor-not-allowed scale-75'}`} 
        onClick={handleNextQuote}
      />
      </span>
      


    </footer>

  );
};

export default Footer;
