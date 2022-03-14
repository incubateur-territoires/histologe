<?php

namespace App\Command;

use App\Entity\Signalement;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Contracts\HttpClient\HttpClientInterface;

#[AsCommand(
    name: 'app:get-geoloc',
    description: 'Add a short description for your command',
)]
class GetGeolocCommand extends Command
{

    private EntityManagerInterface $em;
    private HttpClientInterface $httpClient;

    public function __construct(EntityManagerInterface $entityManager, HttpClientInterface $httpClient)
    {
        // best practices recommend to call the parent constructor first and
        // then set your own properties. That wouldn't work in this case
        // because configure() needs the properties set in this constructor
        $this->em = $entityManager;
        $this->httpClient = $httpClient;

        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('reference', InputArgument::OPTIONAL, 'Argument description')
            ->addOption('option1', null, InputOption::VALUE_NONE, 'Option description');
    }

    protected function setGeolocAndInsee(Signalement $signalement)
    {
        $adresse = $signalement->getAdresseOccupant() . ' ' . $signalement->getCpOccupant() . ' ' . $signalement->getVilleOccupant();
        $response = json_decode($this->httpClient->request('GET', 'https://api-adresse.data.gouv.fr/search/?q=' . $adresse)->getContent(), true);
        $coordinates = $response['features'][0]['geometry']['coordinates'];
        $insee = $response['features'][0]['properties']['citycode'];
        $signalement->setGeoloc(['lat' => $coordinates[0], 'lng' => $coordinates[1]]);
        $signalement->setInseeOccupant($insee);
        return $signalement;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $i = 0;
        $em = $this->em;
        $io = new SymfonyStyle($input, $output);
        $repo = $em->getRepository(Signalement::class);
        $reference = $input->getArgument('reference');
        $io->note($input->getArgument('reference'));
        $signalements = $repo->findAll();
        if ($reference && $signalement = $repo->findOneBy(['reference' => $reference])) {
            $this->setGeolocAndInsee($signalement);
            $em->persist($signalement);
            $i++;
        } else
            foreach ($signalements as $signalement)
                if (!$signalement->getGeoloc() || empty($signalement->getGeoloc()['lat']) || empty($signalement->getGeoloc()['lng'])) {
                    $this->setGeolocAndInsee($signalement);
                    $em->persist($signalement);
                    $i++;
                }
        $em->flush();
        $io->success($i . ' signalement(s) corrigé(s)');

        return Command::SUCCESS;
    }
}
