import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { analyzeTransaction, saveViolations } from '@/lib/policy-analyzer';

export async function POST(request: Request) {
  try {
    const { transactionId } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Fetch the transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Analyze the transaction
    const analysis = await analyzeTransaction(transaction);

    // Save violations if any
    if (analysis.violations.length > 0) {
      await saveViolations(analysis.violations);
      
      // Update transaction status to flagged if critical violations
      if (analysis.riskScore >= 40) {
        await supabase
          .from('transactions')
          .update({ status: 'flagged' })
          .eq('id', transactionId);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        violationCount: analysis.violations.length,
        riskScore: analysis.riskScore,
        recommendations: analysis.recommendations,
      },
    });
  } catch (error) {
    console.error('Error analyzing transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
